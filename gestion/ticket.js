const { MessageEmbed, MessageActionRow, MessageSelectMenu, MessageButton } = require('discord.js');
const db = require('quick.db');
const owner = new db.table("Owner");
const config = require("../config");

module.exports = {
    name: 'ticket',
    usage: 'ticket',
    description: 'Permet de créer un système de ticket personnalisé',
    async execute(client, message) {
        if (!owner.get(`owners.${message.author.id}`) && !config.bot.buyer.includes(message.author.id)) return;

        const embed = new MessageEmbed().setDescription('\u200B');

        const options = [
            { label: "Modifier le Titre", value: "embedtitle", emoji: "📝" },
            { label: "Modifier la Description", value: "embeddescription", emoji: "💬" },
            { label: "Modifier l'Auteur", value: "embedauthor", emoji: "🕵️‍♂️" },
            { label: "Modifier le Footer", value: "embedfooter", emoji: "🔻" },
            { label: "Modifier le Thumbnail", value: "embedthumbnail", emoji: "🔳" },
            { label: "Modifier le Timestamp", value: "embedtimestamp", emoji: "🕙" },
            { label: "Modifier l'Image", value: "embedimage", emoji: "🖼" },
            { label: "Modifier l'URL", value: "embedurl", emoji: "🌐" },
            { label: "Modifier la Couleur", value: "embedcolor", emoji: "🔴" },
            { label: "Ajouter un Field", value: "embedaddfield", emoji: "⤵" },
            { label: "Supprimer un Field", value: "embeddelfield", emoji: "⤴" },
            { label: "Copier un embed existant", value: "embedcopyother", emoji: "📩" }
        ];

        const selectMenu = new MessageSelectMenu()
            .setCustomId("embedbuilder")
            .setPlaceholder("Choisissez une option")
            .addOptions(options);

        const sendButton = new MessageButton()
            .setCustomId("embedsend")
            .setStyle("SUCCESS")
            .setLabel("Envoyer l'embed");

        const actionRow = new MessageActionRow().addComponents(selectMenu);
        const sendRow = new MessageActionRow().addComponents(sendButton);

        const panelMsg = await message.channel.send({ content: `**Panel de création de tickets personnalisés de ${client.user}.**` });
        const embedMsg = await message.channel.send({ embeds: [embed], components: [actionRow, sendRow] });

        const filter = i => i.user.id === message.author.id;
        const collector = embedMsg.createMessageComponentCollector({ filter, time: 900000 });

        const ask = async (prompt) => {
            const sent = await message.channel.send(prompt);
            try {
                const collected = await message.channel.awaitMessages({
                    filter: m => m.author.id === message.author.id,
                    max: 1,
                    time: 60000,
                    errors: ['time']
                });
                await sent.delete().catch(() => null);
                const userMsg = collected.first();
                await userMsg.delete().catch(() => null);
                return userMsg.content;
            } catch {
                await sent.delete().catch(() => null);
                return null;
            }
        };
        collector.on("collect", async interaction => {
            await interaction.deferUpdate();
            const value = interaction.customId === 'embedbuilder' ? interaction.values[0] : interaction.customId;

            switch (value) {
                case 'embedtitle':
                    const title = await ask("Quel sera le **Titre** de l'embed ?");
                    if (!title || title.length > 256) return message.channel.send("Titre invalide ou trop long.");
                    embed.setTitle(title);
                    break;

                case 'embeddescription':
                    const desc = await ask("Quelle sera la **Description** de l'embed ?");
                    if (!desc || desc.length > 4000) return message.channel.send("Description invalide ou trop longue.");
                    embed.setDescription(desc);
                    break;

                case 'embedauthor': {
                    const name = await ask("Nom de l'auteur ?");
                    const icon = await ask("URL de l'avatar de l'auteur ? (laisser vide si aucun)");
                    const url = await ask("URL du nom de l'auteur ? (laisser vide si aucun)");
                    embed.setAuthor({ name, iconURL: icon || null, url: url || null });
                    break;
                }

                case 'embedfooter': {
                    const text = await ask("Texte du footer ?");
                    const icon = await ask("URL de l'icône du footer ? (laisser vide si aucun)");
                    embed.setFooter({ text, iconURL: icon || null });
                    break;
                }

                case 'embedthumbnail': {
                    const url = await ask("URL du thumbnail ?");
                    if (!url) return message.channel.send("URL invalide.");
                    embed.setThumbnail(url);
                    break;
                }

                case 'embedtimestamp': {
                    const timestamp = await ask("Timestamp personnalisé (format ISO) ou 'now' ?");
                    embed.setTimestamp(timestamp && timestamp.toLowerCase() !== 'now' ? new Date(timestamp) : new Date());
                    break;
                }

                case 'embedimage': {
                    const url = await ask("URL de l'image ?");
                    if (!url) return message.channel.send("URL invalide.");
                    embed.setImage(url);
                    break;
                }

                case 'embedurl': {
                    const url = await ask("Lien de l'embed (URL) ?");
                    if (!url.startsWith("http")) return message.channel.send("URL invalide.");
                    embed.setURL(url);
                    break;
                }

                case 'embedcolor': {
                    const color = await ask("Couleur hexadécimale ? (ex: #ff0000)");
                    if (!/^#[0-9A-F]{6}$/i.test(color)) return message.channel.send("Couleur invalide.");
                    embed.setColor(color);
                    break;
                }
                case 'embedaddfield': {
                    const name = await ask("Nom du field ?");
                    const value = await ask("Valeur du field ?");
                    const inlineAnswer = await ask("Afficher en inline ? (oui/non)");
                    const inline = inlineAnswer?.toLowerCase() === 'oui';
                    embed.addField(name, value, inline);
                    break;
                }

                case 'embeddelfield': {
                    const index = await ask("Index du field à supprimer ? (commence à 1)");
                    const i = parseInt(index) - 1;
                    if (isNaN(i) || i < 0 || i >= embed.fields.length) return message.channel.send("Index invalide.");
                    embed.spliceFields(i, 1);
                    break;
                }

                case 'embedcopyother': {
                    const channelId = await ask("Mentionnez ou entrez l'ID du salon contenant l'embed.");
                    const chan = message.mentions.channels.first() || message.guild.channels.cache.get(channelId.replace(/[<#>]/g, ""));
                    if (!chan) return message.channel.send("Salon introuvable.");

                    const msgId = await ask("Entrez l'ID du message contenant l'embed.");
                    const msg = await chan.messages.fetch(msgId).catch(() => null);
                    if (!msg || !msg.embeds.length) return message.channel.send("Aucun embed trouvé.");

                    const source = msg.embeds[0];
                    embed.setTitle(source.title || null);
                    embed.setDescription(source.description || null);
                    embed.setColor(source.color || null);
                    embed.setImage(source.image?.url || null);
                    embed.setThumbnail(source.thumbnail?.url || null);
                    embed.setURL(source.url || null);
                    embed.setAuthor(source.author || null);
                    embed.setFooter(source.footer || null);
                    embed.setFields(source.fields || []);
                    break;
                }

                case 'embedsend': {
                    const chanInput = await ask("Mentionnez le salon où envoyer l'embed.");
                    const targetChan = message.mentions.channels.first() || message.guild.channels.cache.get(chanInput.replace(/[<#>]/g, ""));
                    if (!targetChan) return message.channel.send("Salon introuvable.");
                    await targetChan.send({ embeds: [embed] });
                    return message.channel.send(`Embed envoyé dans **${targetChan.name}**.`);
                }

                default:
                    message.channel.send("Option non reconnue.");
            }

            await embedMsg.edit({ embeds: [embed] });
        });
