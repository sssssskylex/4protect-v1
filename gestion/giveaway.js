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

    if (owner.get(`owners.${message.author.id}`) || message.member.roles.cache.has(pga.fetch(`permga_${message.guild.id}`)) || config.bot.buyer.includes(message.author.id)) {

      let pf = p.fetch(`prefix_${message.guild.id}`) || config.bot.prefixe;
      let color = cl.fetch(`color_${message.guild.id}`) || config.bot.couleur;

      // Création de l'embed pour configurer le giveaway
      const embed = new Discord.MessageEmbed()
        .setTitle('🎉 Lancer un Giveaway')
        .setDescription(`Utilisez le menu ci-dessous pour configurer les paramètres du giveaway.`)
        .addField('Gain', 'Nitro Boost', true)
        .addField('Durée', '30 minutes', true)
        .addField('Salon', '📚・annonce-tempo', true)
        .addField('Nombre de gagnants', '1', true)
        .setColor(color)
        .setFooter('ζ͜͡Dev by ay');

      // Création du menu déroulant (select menu) v13
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
            description: 'Modifier la durée du giveaway',
            value: 'duration',
          },
          {
            label: 'Salon',
            description: 'Modifier le salon où lancer',
            value: 'channel',
          },
          {
            label: 'Nombre de gagnants',
            description: 'Modifier le nombre de gagnants',
            value: 'winners',
          },
          // Ajoute d'autres options si tu veux
        ]);

      const row = new Discord.MessageActionRow().addComponents(selectMenu);

      // Bouton pour lancer le giveaway
      const button = new Discord.MessageButton()
        .setCustomId('giveaway_launch')
        .setLabel('Lancer le Giveaway')
        .setStyle('SUCCESS');

      const row2 = new Discord.MessageActionRow().addComponents(button);

      // Envoi du message avec embed + composants
      const sentMessage = await message.channel.send({ embeds: [embed], components: [row, row2] });

      // Ici tu peux stocker les données du giveaway en cours dans ta DB si besoin
      // Par exemple: db.set(`giveawaySetup_${message.guild.id}_${message.author.id}`, { prize: ..., duration: ..., etc })

      // Ensuite, dans ton event interactionCreate, tu dois gérer les interactions selectMenu & button
      // pour modifier l'embed, mettre à jour les valeurs, et lancer le giveaway quand on clique sur le bouton

    } else {
      message.reply("Vous n'avez pas la permission d'utiliser cette commande.");
    }
  }
};
