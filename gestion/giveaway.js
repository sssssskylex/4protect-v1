const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType,
} = require('discord.js');
const ms = require('ms');
const db = require('quick.db');
const config = require('../config');

const owner = new db.table('Owner');
const pga = new db.table('PermGa');
const cl = new db.table('Color');
const ml = new db.table('giveawaylog');

const GIVEAWAY_OPTIONS = [
  { label: 'Gain', value: 'prize', placeholder: 'Nitro Boost' },
  { label: 'Durée', value: 'duration', placeholder: '30m, 1h, 1d' },
  { label: 'Salon', value: 'channel', placeholder: 'Mentionnez un salon' },
  { label: 'Emoji', value: 'emoji', placeholder: '🎉' },
  { label: 'Nombre de gagnants', value: 'winnerCount', placeholder: '1, 2, 3...' },
  // Ajoute d’autres options si besoin
];

module.exports = {
  name: 'giveaway',
  description: 'Permet de lancer un giveaway via une interface interactive.',
  usage: 'giveaway',
  async execute(client, message, args) {
    if (
      !(
        owner.get(`owners.${message.author.id}`) ||
        message.member.roles.cache.has(pga.fetch(`permga_${message.guild.id}`)) ||
        config.bot.buyer.includes(message.author.id)
      )
    ) {
      return message.reply(':x: Vous n\'avez pas la permission d\'utiliser cette commande.');
    }

    const color = cl.fetch(`color_${message.guild.id}`) || config.bot.couleur;

    // Valeurs par défaut
    const giveawayData = {
      prize: 'Nitro Boost',
      duration: '30m',
      channel: message.channel, // salon par défaut
      emoji: '🎉',
      winnerCount: 1,
    };

    // Crée l'embed résumé
    function generateEmbed(data) {
      return new EmbedBuilder()
        .setTitle('Configuration du Giveaway')
        .setColor(color)
        .addFields(
          { name: 'Gain', value: data.prize || 'Non défini', inline: true },
          { name: 'Durée', value: data.duration || 'Non défini', inline: true },
          { name: 'Salon', value: data.channel ? `<#${data.channel.id}>` : 'Non défini', inline: true },
          { name: 'Emoji', value: data.emoji || '🎉', inline: true },
          { name: 'Nombre de gagnants', value: `${data.winnerCount || 1}`, inline: true },
        )
        .setFooter({ text: 'Utilisez le menu pour modifier les paramètres puis lancez le giveaway.' });
    }

    // Crée le menu déroulant pour modifier
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('giveaway_select')
      .setPlaceholder('Modifier un paramètre du giveaway')
      .addOptions(
        GIVEAWAY_OPTIONS.map((opt) => ({
          label: opt.label,
          value: opt.value,
          description: `Modifier : ${opt.label}`,
        })),
      );

    // Bouton pour lancer le giveaway
    const launchButton = new ButtonBuilder()
      .setCustomId('giveaway_launch')
      .setLabel('Lancer le Giveaway')
      .setStyle(ButtonStyle.Success);

    // Message avec embed + composantes
    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(launchButton);

    const sentMessage = await message.channel.send({
      embeds: [generateEmbed(giveawayData)],
      components: [row1, row2],
    });

    // Collector interactions
    const filter = (i) => i.user.id === message.author.id;
    const collector = message.channel.createMessageComponentCollector({ filter, time: 5 * 60 * 1000 }); // 5 minutes

    // Pour stocker les données modifiées
    let currentData = { ...giveawayData };

    collector.on('collect', async (interaction) => {
      if (interaction.isStringSelectMenu()) {
        // Select menu - ouvrir un modal pour modifier la valeur sélectionnée
        const selected = interaction.values[0];

        // Crée le modal
        const modal = new ModalBuilder()
          .setCustomId(`giveaway_modal_${selected}`)
          .setTitle(`Modifier ${selected}`);

        // Input différent selon le paramètre
        let input;
        if (selected === 'channel') {
          input = new TextInputBuilder()
            .setCustomId('input')
            .setLabel('Mentionnez un salon (ex: #annonces)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: #annonces')
            .setRequired(true);
        } else if (selected === 'winnerCount') {
          input = new TextInputBuilder()
            .setCustomId('input')
            .setLabel('Nombre de gagnants')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: 1')
            .setRequired(true);
        } else if (selected === 'duration') {
          input = new TextInputBuilder()
            .setCustomId('input')
            .setLabel('Durée (ex: 30m, 1h, 1d)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: 30m')
            .setRequired(true);
        } else {
          // prize, emoji ou autre : input texte simple
          input = new TextInputBuilder()
            .setCustomId('input')
            .setLabel(`Nouvelle valeur pour ${selected}`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(GIVEAWAY_OPTIONS.find((o) => o.value === selected)?.placeholder || '')
            .setRequired(true);
        }

        // Un seul composant possible dans modal
        modal.addComponents(new ActionRowBuilder().addComponents(input));

        await interaction.showModal(modal);
      } else if (interaction.isModalSubmit()) {
        // Modal submit
        const id = interaction.customId;
        if (!id.startsWith('giveaway_modal_')) return;

        const field = id.replace('giveaway_modal_', '');
        const value = interaction.fields.getTextInputValue('input');

        // Validation selon le champ
        if (field === 'duration') {
          if (!ms(value)) {
            return interaction.reply({ content: 'Durée invalide, exemple : 30m, 1h, 1d.', ephemeral: true });
          }
          currentData.duration = value;
        } else if (field === 'winnerCount') {
          const count = parseInt(value);
          if (isNaN(count) || count < 1) {
            return interaction.reply({ content: 'Nombre de gagnants invalide.', ephemeral: true });
          }
          currentData.winnerCount = count;
        } else if (field === 'channel') {
          // Chercher le channel mentionné dans la chaîne de texte
          const mention = value.match(/<#(\d+)>/);
          let channel;
          if (mention) {
            channel = interaction.guild.channels.cache.get(mention[1]);
          } else {
            // Essayer par nom simple
            channel = interaction.guild.channels.cache.find(
              (ch) => ch.name.toLowerCase() === value.toLowerCase()
            );
          }
          if (!channel) {
            return interaction.reply({ content: 'Salon non trouvé.', ephemeral: true });
          }
          currentData.channel = channel;
        } else {
          // prize, emoji ou autre champ simple
          currentData[field] = value;
        }

        // Mise à jour du message embed avec nouvelles données
        await interaction.update({
          embeds: [generateEmbed(currentData)],
          components: [new ActionRowBuilder().addComponents(selectMenu), new ActionRowBuilder().addComponents(launchButton)],
        });
      } else if (interaction.isButton()) {
        if (interaction.customId === 'giveaway_launch') {
          // Lancer le giveaway si tout est bon
          if (!currentData.channel || !currentData.prize || !currentData.duration || !currentData.winnerCount) {
            return interaction.reply({ content: 'La configuration est incomplète.', ephemeral: true });
          }

          try {
            await client.giveawaysManager.start(currentData.channel, {
              duration: ms(currentData.duration),
              prize: currentData.prize,
              winnerCount: currentData.winnerCount,
              hostedBy: config.bot.hostedBy ? message.author : null,
              messages: {
                winMessage: 'Félicitations, {winners} ! Vous avez gagné **{prize}** !',
                noWinner: 'Giveaway annulé, aucun membre n\'a participé.',
              },
            });

            await interaction.reply({ content: `🎉 Giveaway lancé dans ${currentData.channel}!`, ephemeral: true });

            const logchannel = client.channels.cache.get(ml.get(`${message.guild.id}.giveawaylog`));
            if (logchannel) {
              const logEmbed = new EmbedBuilder()
                .setColor(color)
                .setDescription(`<@${message.author.id}> a lancé un giveaway dans <#${currentData.channel.id}>`)
                .setTimestamp()
                .setFooter({ text: `📚` });
              logchannel.send({ embeds: [logEmbed] }).catch(() => {});
            }

            collector.stop(); // Arrêter la collecte d'interactions

            // Optionnel : supprimer le message de configuration ou désactiver les composants
            await sentMessage.edit({
              components: [],
            });

          } catch (error) {
            console.error('Erreur lors du lancement du giveaway:', error);
            await interaction.reply({ content: 'Erreur lors du lancement du giveaway.', ephemeral: true });
          }
        }
      }
    });

    collector.on('end', async () => {
      // Après 5 minutes sans activité, désactive les composants
      try {
        await sentMessage.edit({
          components: [],
        });
      } catch {}
    });
  },
};
