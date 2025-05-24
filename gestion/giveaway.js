const Discord = require("discord.js");
const ms = require("ms");
const config = require("../config");
const db = require("quick.db");
const owner = new db.table("Owner");
const pga = new db.table("PermGa");
const cl = new db.table("Color");
const ml = new db.table("giveawaylog");

module.exports = {
  name: "giveaway",
  usage: "giveaway",
  description: "Permet de lancer un giveaway sur le serveur.",
  async execute(client, message, args) {
    if (
      owner.get(`owners.${message.author.id}`) ||
      message.member.roles.cache.has(pga.fetch(`permga_${message.guild.id}`)) ||
      config.bot.buyer.includes(message.author.id) === true
    ) {
      let color = cl.fetch(`color_${message.guild.id}`) || config.bot.couleur;

      // Config initiale
      let giveaway = {
        prize: "Nitro Boost",
        duration: "30m",
        channel: message.channel,
        winners: 1,
        voiceRequired: false,
        requiredRoles: [],
        bannedRoles: [],
        requiredServers: [],
        forcedWinners: [],
        buttonText: "Aucun",
        emoji: "🎉",
      };

      // Création embed d'aperçu
      const createEmbed = () => {
        return new Discord.MessageEmbed()
          .setTitle("🎉 Configuration du Giveaway 🎉")
          .setColor(color)
          .addField("Gain", giveaway.prize, true)
          .addField("Durée", giveaway.duration, true)
          .addField(
            "Salon",
            giveaway.channel ? `<#${giveaway.channel.id}>` : "Non défini",
            true
          )
          .addField("Nombre de gagnants", giveaway.winners.toString(), true)
          .addField(
            "Présence voc obligatoire",
            giveaway.voiceRequired ? "✅" : "❌",
            true
          )
          .addField(
            "Rôles requis",
            giveaway.requiredRoles.length > 0
              ? giveaway.requiredRoles.map((r) => `<@&${r}>`).join(", ")
              : "Aucun",
            true
          )
          .addField(
            "Rôles interdits",
            giveaway.bannedRoles.length > 0
              ? giveaway.bannedRoles.map((r) => `<@&${r}>`).join(", ")
              : "Aucun",
            true
          )
          .addField(
            "Serveurs requis",
            giveaway.requiredServers.length > 0
              ? giveaway.requiredServers.join(", ")
              : "Aucun",
            true
          )
          .addField(
            "Gagnants imposés",
            giveaway.forcedWinners.length > 0
              ? giveaway.forcedWinners.map((id) => `<@${id}>`).join(", ")
              : "Aucun",
            true
          )
          .addField("Texte du bouton", giveaway.buttonText, true)
          .addField("Emoji", giveaway.emoji, true)
          .setFooter({ text: "Dev by ay" })
          .setTimestamp();
      };

      // Menu select sans option "lancer"
      const selectMenu = new Discord.MessageSelectMenu()
        .setCustomId("giveawayConfig")
        .setPlaceholder("Sélectionne une option à modifier")
        .addOptions([
          { label: "Gain", description: "Modifier le gain", value: "prize" },
          { label: "Durée", description: "Modifier la durée", value: "duration" },
          { label: "Salon", description: "Modifier le salon", value: "channel" },
          { label: "Nombre de gagnants", description: "Modifier le nombre", value: "winners" },
          { label: "Présence voc obligatoire", description: "Activer/désactiver", value: "voiceRequired" },
          { label: "Rôles requis", description: "Ajouter/supprimer rôles", value: "requiredRoles" },
          { label: "Rôles interdits", description: "Ajouter/supprimer rôles", value: "bannedRoles" },
          { label: "Serveurs requis", description: "Ajouter/supprimer serveurs", value: "requiredServers" },
          { label: "Gagnants imposés", description: "Ajouter/supprimer gagnants", value: "forcedWinners" },
          { label: "Texte du bouton", description: "Modifier texte bouton", value: "buttonText" },
          { label: "Emoji", description: "Modifier emoji", value: "emoji" },
        ]);

      const rowMenu = new Discord.MessageActionRow().addComponents(selectMenu);

      // Boutons valider & réaction
      const buttonValidate = new Discord.MessageButton()
        .setCustomId("validate")
        .setLabel("Valider")
        .setStyle("SUCCESS");

      const buttonReaction = new Discord.MessageButton()
        .setCustomId("reactionMode")
        .setLabel("Passer en mode réaction")
        .setStyle("SECONDARY");

      const rowButtons = new Discord.MessageActionRow().addComponents(
        buttonValidate,
        buttonReaction
      );

      // Envoi message initial
      const giveawayMessage = await message.channel.send({
        embeds: [createEmbed()],
        components: [rowMenu, rowButtons],
      });

      // Filtre interaction
      const filter = (interaction) =>
        interaction.user.id === message.author.id &&
        ["giveawayConfig", "validate", "reactionMode"].includes(interaction.customId);

      const collector = giveawayMessage.createMessageComponentCollector({
        filter,
        time: 300000, // 5 minutes
      });

      collector.on("collect", async (interaction) => {
        // Gestion menu select
        if (interaction.customId === "giveawayConfig") {
          await interaction.deferUpdate();

          let question;
          switch (interaction.values[0]) {
            case "prize":
              question = "Quel est le **gain** du giveaway ?";
              break;
            case "duration":
              question = "Quelle est la **durée** ? (ex: 30s, 15m, 2h, 1d)";
              break;
            case "channel":
              question = "Quel est le **salon** ? (ID, mention ou #nom)";
              break;
            case "winners":
              question = "Nombre de **gagnants** ?";
              break;
            case "voiceRequired":
              question = "Présence voc obligatoire ? (oui/non)";
              break;
            case "requiredRoles":
              question = "Liste des **rôles requis** (ID/mention, séparés par espaces), ou 'aucun' pour effacer";
              break;
            case "bannedRoles":
              question = "Liste des **rôles interdits** (ID/mention, séparés par espaces), ou 'aucun' pour effacer";
              break;
            case "requiredServers":
              question = "Liste des **serveurs requis** (IDs séparés par espaces), ou 'aucun' pour effacer";
              break;
            case "forcedWinners":
              question = "Liste des **gagnants imposés** (IDs séparés par espaces), ou 'aucun' pour effacer";
              break;
            case "buttonText":
              question = "Texte du bouton ? ('aucun' pour aucun)";
              break;
            case "emoji":
              question = "Quel **emoji** utiliser ?";
              break;
            default:
              question = "Nouvelle valeur ?";
          }

          await interaction.followUp({ content: question, ephemeral: true });

          const msgFilter = (m) => m.author.id === message.author.id;
          const collected = await message.channel.awaitMessages({
            filter: msgFilter,
            max: 1,
            time: 60000,
            errors: ["time"],
          }).catch(() => null);

          if (!collected) {
            return interaction.followUp({
              content: "Temps écoulé, modification annulée.",
              ephemeral: true,
            });
          }

          const userMsg = collected.first();
          const newValue = userMsg.content.trim();

          try {
            await interaction.deleteReply();
            await userMsg.delete();
          } catch {}

          switch (interaction.values[0]) {
            case "prize":
              giveaway.prize = newValue;
              break;

            case "duration":
              if (!ms(newValue)) {
                return interaction.followUp({
                  content: "Durée invalide, essaye à nouveau.",
                  ephemeral: true,
                });
              }
              giveaway.duration = newValue;
              break;

            case "channel":
              let ch =
                message.guild.channels.cache.get(newValue) ||
                message.mentions.channels.first() ||
                message.guild.channels.cache.find(
                  (c) => c.name.toLowerCase() === newValue.toLowerCase().replace("#", "")
                );
              if (!ch)
                return interaction.followUp({
                  content: "Salon invalide, essaye à nouveau.",
                  ephemeral: true,
                });
              giveaway.channel = ch;
              break;

            case "winners":
              const nb = parseInt(newValue);
              if (isNaN(nb) || nb <= 0)
                return interaction.followUp({
                  content: "Nombre de gagnants invalide, essaye à nouveau.",
                  ephemeral: true,
                });
              giveaway.winners = nb;
              break;

            case "voiceRequired":
              if (["oui", "o", "yes", "y"].includes(newValue.toLowerCase()))
                giveaway.voiceRequired = true;
              else if (["non", "n", "no"].includes(newValue.toLowerCase()))
                giveaway.voiceRequired = false;
              else
                return interaction.followUp({
                  content: "Réponse invalide, utilise 'oui' ou 'non'.",
                  ephemeral: true,
                });
              break;

            case "requiredRoles":
              if (newValue.toLowerCase() === "aucun") {
                giveaway.requiredRoles = [];
              } else {
                const roles = newValue
                  .split(/\s+/)
                  .map((r) =>
                    r.match(/^<@&(\d+)>$/) ? r.match(/^<@&(\d+)>$/)[1] : r
