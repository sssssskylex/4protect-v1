module.exports = {
    name: 'support',
    usage: 'support',
    description: `Pour avoir de l'aide`,
    async execute(client, message, args) {

        const support = await message.channel.send(`https://discord.gg/yui`); 
        setTimeout(() => support.delete(), 5000);
        await message.delete();
    }
};
