const Discord = require('discord.js');
const ms = require('ms');
const db = require('quick.db');
const config = require("../config");
const owner = new db.table("Owner");
const p = new db.table("Prefix");
const cl = new db.table("Color");
const ml = new db.table("giveawaylog");
const pga = new db.table("PermGa");

module.exports = {
  name: 'giveaway',
  usage: 'giveaway',
  description: `Permet de lancer un giveaway sur le serveur.`,
  async execute(client, message, args) {

    if (!owner.get(`owners.${message.author.id}`) && !message.member.roles.cache.has(pga.fetch(`permga_${message.guild.id}`)) && !config.bot.buyer.includes(message.author.id)) {
      return message.reply("Vous n'avez pas la permission d'utiliser cette commande.");
    }

    let color = cl.fetch(`color_${message.guild.id}`) || config.bot.couleur;

    // Valeurs par défaut du giveaway
    let giveawayData = {
      prize: "Nitro Boost",
      duration: "30m",
      channel: message.channel, // par défaut le salon actuel
      winners: 1
    };

    // Fonction pour créer l'embed avec les données actuelles
    function createEmbed() {
      return new Discord.MessageEmbed()
        .setTitle('🎉 Lancer un Giveaway')
        .setDescription('Utilisez le menu ci-dessous pour modifier les paramètres du giveaway.\n' +
          'Puis cliquez sur **Lancer le Giveaway** pour démarrer.')
        .addField('Gain', giveawayData.prize, true)
        .addField('Durée', giveawayData.duration, true)
        .addField('Salon', giveawayData.channel ? `<#${giveawayData.channel.id}>` : 'Non défini', true)
        .addField('Nombre de gagnants', giveawayData.winners.toString(), true)
        .setColor(color)
        .setFooter('ζ͜͡Crow Bots');
    }

    // Création du menu déroulant
    const selectMenu = new Discord.MessageSelectMenu()
      .setCustomId('giveaway_config')
      .setPlaceholder('Choisissez un paramètre à modifier')
      .addOptions([
        {
          label: 'Gain',
          description: 'Modifier le gain du giveaway',
          value: 'prize',
        },
        {
          label: 'Durée',
          description: 'Modifier la durée du giveaway (ex: 30s, 15m, 2h, 1d)',
          value: 'duration',
        },
        {
          label: 'Salon',
          description: 'Modifier le salon du giveaway (id ou #nom)',
          value: 'channel',
        },
        {
          label: 'Nombre de gagnants',
          description: 'Modifier le nombre de gagnants',
          value: 'winners',
        },
      ]);

    const rowMenu = new Discord.MessageActionRow().addComponents(selectMenu);

    // Bouton pour lancer le giveaway
    const button = new Discord.MessageButton()
      .setCustomId('giveaway_launch')
      .setLabel('Lancer le Giveaway')
      .setStyle('SUCCESS');

    const rowButton = new Discord.MessageActionRow().addComponents(button);

    // Envoi du message embed + composants
    const giveawayMessage = await message.channel.send({
      embeds: [createEmbed()],
      components: [rowMenu, rowButton],
    });

    // Collecteur d'interactions
    const filter = i => i.user.id === message.author.id;
    const collector = giveawayMessage.createMessageComponentCollector({ filter, time: 300000 }); // 5 min

    collector.on('collect', async interaction => {
      if (interaction.isSelectMenu()) {
        await interaction.deferUpdate();
        const choice = interaction.values[0];

        // On demande à l'utilisateur la nouvelle valeur par message
        message.channel.send(`Veuillez entrer la nouvelle valeur pour **${choice}**:`);

        // Collecteur de message
        const msgFilter = m => m.author.id === message.author.id;
        const collected = await message.channel.awaitMessages({ filter: msgFilter, max: 1, time: 60000, errors: ['time'] }).catch(() => null);

        if (!collected) {
          return message.channel.send("Temps écoulé, modification annulée.");
        }

        const newValue = collected.first().content.trim();

        // Traitement selon le choix
        if (choice === 'duration') {
          // Vérifier que c'est une durée valide
          if (!ms(newValue)) {
            return message.channel.send("Durée invalide. Exemple valide : 30s, 15m, 2h, 1d");
          }
          giveawayData.duration = newValue;

        } else if (choice === 'prize') {
          giveawayData.prize = newValue;

        } else if (choice === 'channel') {
          // Essayer de récupérer le salon
          let channel = null;

          // Par mention
          if (newValue.startsWith('<#') && newValue.endsWith('>')) {
            const id = newValue.slice(2, -1);
            channel = message.guild.channels.cache.get(id);
          } else if (/^\d{17,19}$/.test(newValue)) {
            // Par ID direct
            channel = message.guild.channels.cache.get(newValue);
          } else {
            // Par nom (sans #)
            const name = newValue.replace(/^#/, '');
            channel = message.guild.channels.cache.find(ch => ch.name === name);
          }

          if (!channel) {
            return message.channel.send("Salon invalide, veuillez réessayer avec un ID, une mention ou un nom valide.");
          }

          giveawayData.channel = channel;

        } else if (choice === 'winners') {
          const num = parseInt(newValue);
          if (isNaN(num) || num < 1) {
            return message.channel.send("Nombre de gagnants invalide, il faut un nombre supérieur ou égal à 1.");
          }
          giveawayData.winners = num;
        }

        // Mettre à jour le message avec le nouvel embed
        await giveawayMessage.edit({ embeds: [createEmbed()] });

      } else if (interaction.isButton()) {
        if (interaction.customId === 'giveaway_launch') {
          await interaction.deferUpdate();

          // Lancer le giveaway avec client.giveawaysManager.start
          try {
            await client.giveawaysManager.start(giveawayData.channel, {
              duration: ms(giveawayData.duration),
              prize: giveawayData.prize,
              winnerCount: giveawayData.winners,
              hostedBy: config.bot.hostedBy ? message.author : null,
              messages: {
                winMessage: 'Félicitations, {winners} ! Vous avez gagné **{this.prize}** !',
                noWinner: 'Giveaway annulé, aucun membre n\'a participé.',
                giveaway: '🎉 **GIVEAWAY** 🎉',
                giveawayEnded: '🎉 **GIVEAWAY TERMINÉ** 🎉',
                timeRemaining: 'Temps restant : **{duration}**!',
                inviteToParticipate: 'Réagissez avec 🎉 pour participer !',
                hostedBy: 'Organisé par : {user}',
                winners: 'Gagnant(s)',
                endedAt: 'Terminé à',
                units: {
                  seconds: 'secondes',
                  minutes: 'minutes',
                  hours: 'heures',
                  days: 'jours',
                  pluralS: false
                }
              }
            });

            message.channel.send(`Giveaway lancé dans ${giveawayData.channel}!`);
            collector.stop();

          } catch (err) {
            console.error(err);
            message.channel.send("Une erreur est survenue lors du lancement du giveaway.");
          }
        }
      }
    });

    collector.on('end', () => {
      giveawayMessage.edit({ components: [] }).catch(() => { });
    });

  }
};
