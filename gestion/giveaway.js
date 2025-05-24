const Discord = require("discord.js");
const ms = require("ms");
const config = require("../config");
const db = require("quick.db");
const owner = new db.table("Owner");
const pga = new db.table("PermGa");
const cl = new db.table("Color");

module.exports = {
  name: "giveaway",
  usage: "giveaway",
  description: "Permet de lancer un giveaway sur le serveur.",
  async execute(client, message, args) {
    if (
      owner.get(`owners.${message.author.id}`) ||
      message.member.roles.cache.has(pga.fetch(`permga_${message.guild.id}`)) ||
      config.bot.buyer.includes(message.author.id)
    ) {
      let color = cl.fetch(`color_${message.guild.id}`) || config.bot.couleur;

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
        buttonText: "Participer",
        emoji: "🎉",
      };

      const createEmbed = () => {
        return new Discord.MessageEmbed()
          .setTitle("🎉 Configuration du Giveaway 🎉")
          .setColor(color)
          .addField("Gain", giveaway.prize || "Non défini", true)
          .addField("Durée", giveaway.duration || "Non défini", true)
          .addField(
            "Salon",
            giveaway.channel ? `<#${giveaway.channel.id}>` : "Non défini",
            true
          )
          .addField("Nombre de gagnants", giveaway.winners.toString(), true)
          .addField(
            "Présence en vocal obligatoire",
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
              ? giveaway.forcedWinners.join(", ")
              : "Aucun",
            true
          )
          .addField("Texte du bouton", giveaway.buttonText || "Aucun", true)
          .addField("Emoji", giveaway.emoji || "🎉", true)
          .setFooter({ text: "Dev by ay" })
          .setTimestamp();
      };

      const selectMenu = new Discord.MessageSelectMenu()
        .setCustomId("giveawayConfig")
        .setPlaceholder("Sélectionne une option à modifier")
        .addOptions([
          { label: "Gain", description: "Modifier le gain du giveaway", value: "prize" },
          { label: "Durée", description: "Modifier la durée du giveaway", value: "duration" },
          { label: "Salon", description: "Modifier le salon du giveaway", value: "channel" },
          { label: "Nombre de gagnants", description: "Modifier le nombre de gagnants", value: "winners" },
          { label: "Présence en vocal obligatoire", description: "Modifier la présence en vocal obligatoire", value: "voiceRequired" },
          { label: "Rôles requis", description: "Modifier les rôles requis", value: "requiredRoles" },
          { label: "Rôles interdits", description: "Modifier les rôles interdits", value: "bannedRoles" },
          { label: "Serveurs requis", description: "Modifier les serveurs requis", value: "requiredServers" },
          { label: "Gagnants imposés", description: "Modifier les gagnants imposés", value: "forcedWinners" },
          { label: "Texte du bouton", description: "Modifier le texte du bouton", value: "buttonText" },
          { label: "Emoji", description: "Modifier l'emoji du giveaway", value: "emoji" },
        ]);

      const rowMenu = new Discord.MessageActionRow().addComponents(selectMenu);

      const buttonValidate = new Discord.MessageButton()
        .setCustomId("validate")
        .setLabel("Valider")
        .setStyle("SUCCESS");

      const buttonReaction = new Discord.MessageButton()
        .setCustomId("reactionMode")
        .setLabel("Passer en mode réaction")
        .setStyle("SECONDARY");

      const rowButtons = new Discord.MessageActionRow().addComponents(buttonValidate, buttonReaction);

      const giveawayMessage = await message.channel.send({
        embeds: [createEmbed()],
        components: [rowMenu, rowButtons],
      });

      const filter = (interaction) =>
        interaction.user.id === message.author.id &&
        ["giveawayConfig", "validate", "reactionMode"].includes(interaction.customId);

      const collector = giveawayMessage.createMessageComponentCollector({
        filter,
        time: 300000, // 5 minutes
      });

      collector.on("collect", async (interaction) => {
        if (interaction.customId === "giveawayConfig") {
          await interaction.deferUpdate();

          let question;
          switch (interaction.values[0]) {
            case "prize":
              question = "Quel est le **gain** du giveaway ?";
              break;
            case "duration":
              question = "Quelle est la **durée** du giveaway ? (ex: 30s, 15m, 2h, 1d)";
              break;
            case "channel":
              question = "Quel est le **salon** du giveaway ? (ID, mention ou #nom)";
              break;
            case "winners":
              question = "Quel est le **nombre de gagnants** ?";
              break;
            case "voiceRequired":
              question = "Présence en vocal obligatoire ? (oui/non)";
              break;
            case "requiredRoles":
              question = "Quels sont les **rôles requis** ? (IDs, mentions séparées par espace ou 'aucun')";
              break;
            case "bannedRoles":
              question = "Quels sont les **rôles interdits** ? (IDs, mentions séparées par espace ou 'aucun')";
              break;
            case "requiredServers":
              question = "Quels sont les **serveurs requis** ? (IDs séparés par espace ou 'aucun')";
              break;
            case "forcedWinners":
              question = "Quels sont les **gagnants imposés** ? (IDs séparés par espace ou 'aucun')";
              break;
            case "buttonText":
              question = "Quel est le **texte du bouton** ?";
              break;
            case "emoji":
              question = "Quel est l'**emoji** du giveaway ?";
              break;
            default:
              question = "Veuillez entrer la nouvelle valeur :";
          }

          const botMsg = await message.channel.send(question);

          const msgFilter = (m) => m.author.id === message.author.id;
          const collected = await message.channel.awaitMessages({
            filter: msgFilter,
            max: 1,
            time: 60000,
            errors: ["time"],
          }).catch(() => null);

          if (!collected) {
            await botMsg.delete().catch(() => {});
            return message.channel.send("Temps écoulé, modification annulée.");
          }

          const userMsg = collected.first();
          const newValue = userMsg.content.trim();

          await botMsg.delete().catch(() => {});
          await userMsg.delete().catch(() => {});

          // Validation et mise à jour selon le champ modifié
          switch (interaction.values[0]) {
            case "prize":
              giveaway.prize = newValue;
              break;

            case "duration":
              if (!ms(newValue)) {
                return message.channel.send("Durée invalide, essayez à nouveau.");
              }
              giveaway.duration = newValue;
              break;

            case "channel":
              const ch =
                message.guild.channels.cache.get(newValue) ||
                message.mentions.channels.first() ||
                message.guild.channels.cache.find(
                  (c) => c.name.toLowerCase() === newValue.toLowerCase().replace("#", "")
                );
              if (!ch) {
                return message.channel.send("Salon invalide, essayez à nouveau.");
              }
              giveaway.channel = ch;
              break;

            case "winners":
              const nb = parseInt(newValue);
              if (isNaN(nb) || nb <= 0) {
                return message.channel.send("Nombre de gagnants invalide, essayez à nouveau.");
              }
              giveaway.winners = nb;
              break;

            case "voiceRequired":
              if (["oui", "yes", "y", "true"].includes(newValue.toLowerCase())) {
                giveaway.voiceRequired = true;
              } else if (["non", "no", "n", "false"].includes(newValue.toLowerCase())) {
                giveaway.voiceRequired = false;
              } else {
                return message.channel.send("Réponse invalide, veuillez répondre par oui ou non.");
              }
              break;

            case "requiredRoles":
              if (newValue.toLowerCase() === "aucun") {
                giveaway.requiredRoles = [];
              } else {
                giveaway.requiredRoles = newValue
                  .split(/\s+/)
                  .map((r) => (r.match(/^<@&(\d+)>$/) ? r.match(/^<@&(\d+)>$/)[1] : r));
              }
              break;

            case "bannedRoles":
              if (newValue.toLowerCase() === "aucun") {
                giveaway.bannedRoles = [];
              } else {
                giveaway.bannedRoles = newValue
                  .split(/\s+/)
                  .map((r) => (r.match(/^<@&(\d+)>$/) ? r.match(/^<@&(\d+)>$/)[1] : r));
              }
              break;

            case "requiredServers":
              if (newValue.toLowerCase() === "aucun") {
                giveaway.requiredServers = [];
              } else {
                giveaway.requiredServers = newValue.split(/\s+/);
              }
              break;

            case "forcedWinners":
              if (newValue.toLowerCase() === "aucun") {
                giveaway.forcedWinners = [];
              } else {
                giveaway.forcedWinners = newValue.split(/\s+/);
              }
              break;

            case "buttonText":
              giveaway.buttonText = newValue;
              break;

            case "emoji":
              giveaway.emoji = newValue;
              break;

            default:
              break;
          }

          // Met à jour le message embed avec la nouvelle config
          await interaction.editReply({ embeds: [createEmbed()], components: [rowMenu, rowButtons] });
        }
        else if (interaction.customId === "validate") {
          await interaction.deferUpdate();
          // Code pour lancer le giveaway (à compléter selon ta logique)
          return message.channel.send("Giveaway lancé avec la configuration actuelle !");
        }
        else if (interaction.customId === "reactionMode") {
          await interaction.deferUpdate();
          // Code pour passer en mode réaction (à compléter selon ta logique)
          return message.channel.send("Mode réaction activé !");
        }
      });

      collector.on("end", () => {
        giveawayMessage.edit({ components: [] }).catch(() => {});
      });
    } else {
      return message.reply("Vous n'avez pas la permission d'utiliser cette commande.");
    }
  },
};
