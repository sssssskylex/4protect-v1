const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketsettings')
    .setDescription('Configurer un panel de ticket')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName('panel')
        .setDescription('Nom du panel (ex: staff, question, etc.)')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('categorie')
        .setDescription('Catégorie où seront créés les tickets')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true))
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Description pour le sélecteur (ex: Support général)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('emoji')
        .setDescription('Emoji pour le selecteur (ex: 🎫)')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('log_channel')
        .setDescription('Salon de logs des tickets')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('mention_role')
        .setDescription('Rôle mentionné à l’ouverture du ticket')
        .setRequired(false))
    .addRoleOption(option =>
      option.setName('access_role')
        .setDescription('Rôle ayant accès au ticket')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('channel_name')
        .setDescription('Nom du salon (utilisez {TicketNumber} pour numéro automatique)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('open_message')
        .setDescription('Message à envoyer dans le ticket à son ouverture')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Type d’interface (select ou bouton)')
        .addChoices(
          { name: 'Selecteur', value: 'select' },
          { name: 'Bouton', value: 'button' }
        )
        .setRequired(true)),

  async execute(interaction) {
    const panelName = interaction.options.getString('panel');
    const settings = {
      categorieId: interaction.options.getChannel('categorie').id,
      description: interaction.options.getString('description'),
      emoji: interaction.options.getString('emoji'),
      logChannelId: interaction.options.getChannel('log_channel').id,
      mentionRoleId: interaction.options.getRole('mention_role')?.id || null,
      accessRoleId: interaction.options.getRole('access_role').id,
      channelName: interaction.options.getString('channel_name'),
      openMessage: interaction.options.getString('open_message'),
      type: interaction.options.getString('type'),
    };

    // Sauvegarde en base de données ou JSON
    const fs = require('fs');
    const path = './ticketPanels.json';
    let data = {};
    if (fs.existsSync(path)) {
      data = JSON.parse(fs.readFileSync(path));
    }

    data[panelName] = settings;
    fs.writeFileSync(path, JSON.stringify(data, null, 2));

    await interaction.reply({
      content: `✅ Le panel \`${panelName}\` a bien été configuré !`,
      ephemeral: true
    });
  }
};
