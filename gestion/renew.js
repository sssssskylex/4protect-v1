const Discord = require("discord.js");
const config = require("../config");
const db = require("quick.db");
const owner = new db.table("Owner");
const cl = new db.table("Color");
const ml = new db.table("modlog");
const p3 = new db.table("Perm3");

module.exports = {
    name: 'renew',
    usage: 'renew',
    description: `Permet de renew un salon.`,
    async execute(client, message, args) {
        // Vérification des permissions du user
        if (
            owner.get(`owners.${message.author.id}`) ||
            message.member.roles.cache.has(p3.fetch(`perm3_${message.guild.id}`)) ||
            config.bot.buyer.includes(message.author.id) === true
        ) {
            let color = cl.fetch(`color_${message.guild.id}`) || config.bot.couleur;

            if (args[0] === "all") {
                // Filtrer tous les salons hors catégories
                const channels = message.guild.channels.cache.filter(ch => ch.type !== 'category');

                // Traitement séquentiel avec for...of pour éviter les erreurs async
                for (const channel of channels.values()) {
                    try {
                        // Cloner le salon avec ses propriétés
                        const clonedChannel = await channel.clone({
                            name: channel.name,
                            permissions: channel.permissionOverwrites,
                            type: channel.type,
                            topic: channel.topic,
                            nsfw: channel.nsfw,
                            bitrate: channel.bitrate,
                            userLimit: channel.userLimit,
                            rateLimitPerUser: channel.rateLimitPerUser,
                            position: channel.rawPosition,
                            reason: `Tous les salons ont été recréés par ${message.author.tag} (${message.author.id})`
                        });

                        // Vérifier que le salon existe toujours avant suppression
                        const fetchedChannel = message.guild.channels.cache.get(channel.id);
                        if (fetchedChannel && fetchedChannel.deletable) {
                            await fetchedChannel.delete();
                        }

                        // Envoyer un message dans le nouveau salon et le supprimer après 2 sec
                        const sentMessage = await clonedChannel.send(`<@${message.author.id}> Salon recréé !`);
                        setTimeout(() => sentMessage.delete().catch(() => {}), 2000);
                    } catch (error) {
                        console.error(`Erreur lors de la recréation du salon ${channel.name}:`, error);
                    }
                }

                // Envoyer un log embed
                const embed = new Discord.MessageEmbed()
                    .setColor(color)
                    .setDescription(`<@${message.author.id}> a \`renew\` tous les salons`)
                    .setTimestamp()
                    .setFooter({ text: `📚` });

                const logchannel = client.channels.cache.get(ml.get(`${message.guild.id}.modlog`));
                if (logchannel) logchannel.send({ embeds: [embed] }).catch(() => false);

            } else {
                // Renew d'un salon unique (mentionné, par ID ou salon actuel)
                let channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.channel;

                if (!channel.deletable) return message.reply("*Impossible de renew ce channel !*");

                try {
                    // Cloner le salon
                    const clonedChannel = await channel.clone({
                        name: channel.name,
                        permissions: channel.permissionOverwrites,
                        type: channel.type,
                        topic: channel.topic,
                        nsfw: channel.nsfw,
                        bitrate: channel.bitrate,
                        userLimit: channel.userLimit,
                        rateLimitPerUser: channel.rateLimitPerUser,
                        position: channel.rawPosition,
                        reason: `Le salon a été recréé par ${message.author.tag} (${message.author.id})`
                    });

                    // Vérifier que le salon existe toujours avant suppression
                    const fetchedChannel = message.guild.channels.cache.get(channel.id);
                    if (fetchedChannel && fetchedChannel.deletable) {
                        await fetchedChannel.delete();
                    }

                    const sentMessage = await clonedChannel.send(`<@${message.author.id}> Salon recréé !`);
                    setTimeout(() => sentMessage.delete().catch(() => {}), 2000);

                    // Log embed
                    const embed = new Discord.MessageEmbed()
                        .setColor(color)
                        .setDescription(`<@${message.author.id}> a \`renew\` le salon ${channel.name}`)
                        .setTimestamp()
                        .setFooter({ text: `📚` });

                    const logchannel = client.channels.cache.get(ml.get(`${message.guild.id}.modlog`));
                    if (logchannel) logchannel.send({ embeds: [embed] }).catch(() => false);

                } catch (error) {
                    console.error(`Erreur lors de la recréation du salon ${channel.name}:`, error);
                }
            }
        }
    }
};
