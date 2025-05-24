
const ms = require('ms'),	const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
    { MessageEmbed, MessageActionRow, MessageSelectMenu, MessageButton } = require('discord.js');	

const Discord = require("discord.js")	
const db = require('quick.db')	
const owner = new db.table("Owner")	
const config = require("../config")	


module.exports = {	module.exports = {
    name: 'ticket',	  data: new SlashCommandBuilder()
    usage: 'ticket',	    .setName('ticketsettings')
    description: `Permet de créer un système de ticket personnalisé`,	    .setDescription('Configurer un panel de ticket')
    async execute(client, message, args) {	    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addStringOption(option =>
        if (owner.get(`owners.${message.author.id}`) || config.bot.buyer.includes(message.author.id)   === true) {	      option.setName('panel')

        .setDescription('Nom du panel (ex: staff, question, etc.)')
            let selectMenuOptions = [	        .setRequired(true))
                {	    .addChannelOption(option =>
                    label: "Modifier le Titre",	      option.setName('categorie')
                    value: "embedtitle", emoji: "📝"	        .setDescription('Catégorie où seront créés les tickets')
                }, {	        .addChannelTypes(ChannelType.GuildCategory)
                    label: "Modifier la Description",	        .setRequired(true))
                    value: "embeddescription", emoji: "💬"	    .addStringOption(option =>
                }, {	      option.setName('description')
                    label: "Modifier l'Auteur",	        .setDescription('Description pour le sélecteur (ex: Support général)')
                    value: "embedauthor", emoji: "🕵️‍♂️"	        .setRequired(true))
                }, {	    .addStringOption(option =>
                    label: "Modifier le Footer",	      option.setName('emoji')
                    value: "embedfooter", emoji: "🔻"	        .setDescription('Emoji pour le selecteur (ex: 🎫)')
                }, {	        .setRequired(true))
                    label: "Modifier le Thumbnail",	    .addChannelOption(option =>
                    value: "embedthumbnail", emoji: "🔳"	      option.setName('log_channel')
                }, {	        .setDescription('Salon de logs des tickets')
                    label: "Modifier le Timestamp",	        .addChannelTypes(ChannelType.GuildText)
                    value: "embedtimestamp", emoji: "🕙"	        .setRequired(true))
                }, {	    .addRoleOption(option =>
                    label: "Modifier l'Image",	      option.setName('mention_role')
                    value: "embedimage", emoji: "🖼"	        .setDescription('Rôle mentionné à l’ouverture du ticket')
                }, {	        .setRequired(false))
                    label: "Modifier l'URL",	    .addRoleOption(option =>
                    value: "embedurl", emoji: "🌐"	      option.setName('access_role')
                }, {	        .setDescription('Rôle ayant accès au ticket')
                    label: "Modifier la Couleur",	        .setRequired(true))
                    value: "embedcolor", emoji: "🔴"	    .addStringOption(option =>
                }, {	      option.setName('channel_name')
                    label: "Ajouter un Field",	        .setDescription('Nom du salon (utilisez {TicketNumber} pour numéro automatique)')
                    value: "embedaddfield", emoji: "⤵"	        .setRequired(true))
                }, {	    .addStringOption(option =>
                    label: "Supprimer un Field",	      option.setName('open_message')
                    value: "embeddelfield", emoji: "⤴"	        .setDescription('Message à envoyer dans le ticket à son ouverture')
                }, {	        .setRequired(true))
                    label: "Copier un embed existant",	    .addStringOption(option =>
                    value: "embedcopyother", emoji: "📩"	      option.setName('type')
                }	        .setDescription('Type d’interface (select ou bouton)')
            ]	        .addChoices(
            var selectMenu = new MessageSelectMenu()	          { name: 'Selecteur', value: 'select' },
                .setCustomId("embedbuilder")	          { name: 'Bouton', value: 'button' }
                .setPlaceholder("Choisissez une option")	        )
                .addOptions([selectMenuOptions])	        .setRequired(true)),


            var b1 = new MessageButton()	  async execute(interaction) {
                .setCustomId("embedsend")	    const panelName = interaction.options.getString('panel');
                .setStyle("SUCCESS")	    const settings = {
                .setLabel("Envoyer l'embed")	      categorieId: interaction.options.getChannel('categorie').id,

      description: interaction.options.getString('description'),
            var embedBuilderActionRow = new MessageActionRow()	      emoji: interaction.options.getString('emoji'),
                .addComponents([selectMenu])	      logChannelId: interaction.options.getChannel('log_channel').id,

      mentionRoleId: interaction.options.getRole('mention_role')?.id || null,
            var embedBuilderActionRowSendEdit = new MessageActionRow()	      accessRoleId: interaction.options.getRole('access_role').id,
                .addComponents([b1])	      channelName: interaction.options.getString('channel_name'),

      openMessage: interaction.options.getString('open_message'),
            let embed = (new MessageEmbed({ description: '\u200B' }))	      type: interaction.options.getString('type'),

    };
            message.channel.send({ content: `**Panel de création de tickets personnalisés de ${client.user}.**` }).then(async d => {	
                let msgembed = await d.channel.send({ embeds: [embed], components: [embedBuilderActionRow, embedBuilderActionRowSendEdit] }).catch(async err => { return; })	    // Sauvegarde en base de données ou JSON
                const filter = m => message.author.id === m.author.id;	    const fs = require('fs');
                const filterSelect = i => message.author.id === i.user.id;	    const path = './ticketPanels.json';
                const collector = d.channel.createMessageComponentCollector({	    let data = {};
                    filterSelect,	    if (fs.existsSync(path)) {
                    componentType: "SELECT_MENU",	      data = JSON.parse(fs.readFileSync(path));
                })	    }
                const collectorX = d.channel.createMessageComponentCollector({	
                    filterSelect,	
