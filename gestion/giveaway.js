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

      // Variables giveaway initiales (avec nouvelles options)
      let giveaway = {
        prize: "Nitro Boost",
        duration: "30m",
        channel: message.channel,
        winners: 1,
        voiceRequired: false, // présence voc obligatoire ?
        requiredRoles: [], // IDs de rôles requis
        bannedRoles: [], // IDs rôles interdits
        requiredServers: [], // IDs serveurs requis
        forcedWinners: [], // IDs gagnants imposés
        buttonText: "Aucun",
        buttonColor: "⚪",
        emoji: "🎉",
      };

      // Fonction pour créer l'embed d'aperçu du giveaway
      const createEmbed = () => {
        return new Discord.MessageEmbed()
          .setTitle("Paramètres du giveaway ")
          .setColor(color)
          .addField("Gain", giveaway.prize, true)
          .addField("Durée", giveaway.duration, true)
          .addField(
            "Salon",
            giveaway.channel
              ? `<#${giveaway.channel.id}>`
              : "Non défini",
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
              ? giveaway.forcedWinners.map((u) => `<@${u}>`).join(", ")
              : "Aucun",
            true
          )
          .addField("Texte du bouton", giveaway.buttonText, true)
          .addField("Couleur du bouton", giveaway.buttonColor, true)
          .addField("Emoji", giveaway.emoji, true)
          .setFooter({ text: "Dev by ay" })
          .setTimestamp();
      };

      // Création du menu déroulant avec toutes options
      const selectMenu = new Discord.MessageSelectMenu()
        .setCustomId("giveawayConfig")
        .setPlaceholder("Sélectionne une option à modifier")
        .addOptions([
          { label: "Gain", description: "Modifier le gain du giveaway", value: "prize" },
          { label: "Durée", description: "Modifier la durée du giveaway", value: "duration" },
          { label: "Salon", description: "Modifier le salon du giveaway", value: "channel" },
          { label: "Nombre de gagnants", description: "Modifier le nombre de gagnants", value: "winners" },
          { label: "Présence voc obligatoire", description: "Activer ou désactiver", value: "voiceRequired" },
          { label: "Rôles requis", description: "Modifier les rôles requis (IDs séparés par espace)", value: "requiredRoles" },
          { label: "Rôles interdits", description: "Modifier les rôles interdits (IDs séparés par espace)", value: "bannedRoles" },
          { label: "Serveurs requis", description: "Modifier les serveurs requis (IDs séparés par espace)", value: "requiredServers" },
          { label: "Gagnants imposés", description: "Modifier les gagnants imposés (IDs séparés par espace)", value: "forcedWinners" },
          { label: "Texte du bouton", description: "Modifier le texte du bouton", value: "buttonText" },
          { label: "Couleur du bouton", description: "Modifier la couleur du bouton", value: "buttonColor" },
          { label: "Emoji", description: "Modifier l'emoji du giveaway", value: "emoji" },
          { label: "Lancer le giveaway", description: "Démarrer le giveaway", value: "start" },
        ]);

      const row = new Discord.MessageActionRow().addComponents(selectMenu);

      // Envoi du message avec embed + menu
      const giveawayMessage = await message.channel.send({
        embeds: [createEmbed()],
        components: [row],
      });

      const filter = (interaction) =>
        interaction.user.id === message.author.id &&
        interaction.customId === "giveawayConfig";

      const collector = giveawayMessage.createMessageComponentCollector({
        filter,
        time: 300000, // 5 minutes
      });

      collector.on("collect", async (interaction) => {
        await interaction.deferUpdate();

        if (interaction.values[0] === "start") {
          // Valider données avant lancement (ajouter validations pour nouvelles options si besoin)
          if (!giveaway.channel)
            return message.channel.send("Le salon du giveaway n'est pas valide !");
          if (!ms(giveaway.duration))
            return message.channel.send("La durée du giveaway n'est pas valide !");
          if (isNaN(giveaway.winners) || giveaway.winners <= 0)
            return message.channel.send("Le nombre de gagnants doit être un nombre supérieur à 0 !");
          if (!giveaway.prize)
            return message.channel.send("Le gain du giveaway est vide !");

          // Ici, ajoute la gestion des options avancées dans client.giveawaysManager.start
          await client.giveawaysManager.start(giveaway.channel, {
            duration: ms(giveaway.duration),
            prize: giveaway.prize,
            winnerCount: giveaway.winners,
            hostedBy: config.bot.hostedBy ? message.author : null,
            // Optionnel : ajoute tes options personnalisées ici selon ta lib giveawaysManager
            extraData: {
              voiceRequired: giveaway.voiceRequired,
              requiredRoles: giveaway.requiredRoles,
              bannedRoles: giveaway.bannedRoles,
              requiredServers: giveaway.requiredServers,
              forcedWinners: giveaway.forcedWinners,
              buttonText: giveaway.buttonText,
              buttonColor: giveaway.buttonColor,
              emoji: giveaway.emoji,
            },
            winMessage:
              "Félicitation, {winners}! Vous avez gagné **{this.prize}**!",
            noWinner: "Giveaway annulé, aucun membre n'a participé.",
            messages: {
              giveaway: "🎉 **GIVEAWAY** 🎉",
              giveawayEnded: "🎉 **GIVEAWAY TERMINÉ** 🎉",
              timeRemaining: "Temps restant : **{duration}**!",
              inviteToParticipate: "Réagissez avec 🎉 pour participer!",
              winMessage: "Félicitations, {winners}! Vous avez gagné **{prize}**!",
              embedFooter: "Giveaway",
              noWinner: "Giveaway annulé, aucun participant.",
              hostedBy: "Organisé par : {user}",
              winners: "gagnant(s)",
              endedAt: "Terminé le",
            },
          });

          const embedLog = new Discord.MessageEmbed()
            .setColor(color)
            .setDescription(`<@${message.author.id}> a lancé un giveaway dans <#${giveaway.channel.id}>`)
            .setTimestamp()
            .setFooter({ text: "📚" });

          const logchannel = client.channels.cache.get(ml.get(`${message.guild.id}.giveawaylog`));
          if (logchannel) logchannel.send({ embeds: [embedLog] }).catch(() => {});

          collector.stop("started");
          return giveawayMessage.edit({
            content: "Giveaway lancé avec succès !",
            embeds: [],
            components: [],
          });
        }

        // Questions selon option choisie
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
            question = "Présence voc obligatoire ? (oui/non)";
            break;
          case "requiredRoles":
            question = "Quels sont les **rôles requis** ? (IDs séparés par un espace ou 'aucun')";
            break;
          case "bannedRoles":
            question = "Quels sont les **rôles interdits** ? (IDs séparés par un espace ou 'aucun')";
            break;
          case "requiredServers":
            question = "Quels sont les **serveurs requis** ? (IDs séparés par un espace ou 'aucun')";
            break;
          case "forcedWinners":
            question = "Quels sont les **gagnants imposés** ? (IDs séparés par un espace ou 'aucun')";
            break;
          case "buttonText":
            question = "Quel est le **texte du bouton** ?";
            break;
          case "buttonColor":
            question = "Quelle est la **couleur du bouton** ?";
            break;
          case "emoji":
            question = "Quel est l'**emoji** ?";
            break;
          default:
            question = "Veuillez entrer la nouvelle valeur :";
        }

        // Envoi de la question
        await message.channel.send(question).then(async (botMsg) => {
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

          // Supprimer question et réponse pour propreté
          await botMsg.delete().catch(() => {});
          await userMsg.delete().catch(() => {});

          // Traitement selon option
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
              let ch =
                message.guild.channels.cache.get(newValue) ||
                message.mentions.channels.first() ||
                message.guild.channels.cache.find(
                  (c) => c.name.toLowerCase() === newValue.toLowerCase().replace("#", "")
                );
              if (!ch) return message.channel.send("Salon invalide, essayez à nouveau.");
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
              if (newValue.toLowerCase() === "oui") giveaway.voiceRequired = true;
              else if (newValue.toLowerCase() === "non") giveaway.voiceRequired = false;
              else return message.channel.send("Réponse invalide, veuillez répondre par oui ou non.");
              break;
            case "requiredRoles":
              if (newValue.toLowerCase() === "aucun") giveaway.requiredRoles = [];
              else {
                // Filtrer IDs valides
                const rolesReq = newValue.split(/\s+/).filter(id => message.guild.roles.cache.has(id));
                if (rolesReq.length === 0) return message.channel.send("Aucun rôle valide détecté.");
                giveaway.requiredRoles = rolesReq;
              }
              break;
            case "bannedRoles":
              if (newValue.toLowerCase() === "aucun") giveaway.bannedRoles = [];
              else {
                const rolesBan = newValue.split(/\s+/).filter(id => message.guild.roles.cache.has(id));
                if (rolesBan.length === 0) return message.channel.send("Aucun rôle valide détecté.");
                giveaway.bannedRoles = rolesBan;
              }
              break;
            case "requiredServers":
              if (newValue.toLowerCase() === "aucun") giveaway.requiredServers = [];
              else {
                const servers = newValue.split(/\s+/);
                giveaway.requiredServers = servers; // Pas de validation possible ici (serveurs externes)
              }
              break;
            case "forcedWinners":
              if (newValue.toLowerCase() === "aucun") giveaway.forcedWinners = [];
              else {
                const users = newValue.split(/\s+/);
                giveaway.forcedWinners = users;
              }
              break;
            case "buttonText":
              giveaway.buttonText = newValue || "Aucun";
              break;
            case "buttonColor":
              giveaway.buttonColor = newValue || "⚪";
              break;
            case "emoji":
              giveaway.emoji = newValue || "🎉";
              break;
          }

          // Mise à jour embed
          await giveawayMessage.edit({ embeds: [createEmbed()] });
        });
      });

      collector.on("end", (_, reason) => {
        if (reason !== "started") {
          giveawayMessage.edit({
            content: "Configuration du giveaway terminée ou annulée.",
            embeds: [],
            components: [],
          });
        }
      });
    }
  },
};
