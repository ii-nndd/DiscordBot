const { Client, GatewayIntentBits, REST, Routes, Collection } = require('discord.js');
const { GoogleGenAI } = require('@google/genai');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// سيرفر الويب لريندر عشان يبقى البوت شغال
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Arthur & Joud Discord Bot is running live!');
});

app.listen(PORT, () => {
    console.log(`🌐 Web server is running on port ${PORT}`);
});

// إعداد ديسكورد مع صلاحيات الفويس والرسائل
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates, // ضرورية جداً للفويس
    ]
});

client.commands = new Collection();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// تحميل الأوامر (مثل أمر /اسأل)
const aiCommandPath = path.join(__dirname, 'commands', 'ai.js');
if (fs.existsSync(aiCommandPath)) {
    const aiCommand = require(aiCommandPath);
    if ('data' in aiCommand && 'execute' in aiCommand) {
        client.commands.set(aiCommand.data.name, aiCommand);
    }
}

client.once('ready', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}!`);

    const commands = [];
    client.commands.forEach(cmd => commands.push(cmd.data.toJSON()));

    const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
    if (!token) {
        console.error("❌ الخطأ: توكن البوت غير موجود في Environment Variables!");
        return;
    }

    const rest = new REST({ version: '10' }).setToken(token);

    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('Successfully reloaded application commands.');
    } catch (error) {
        console.error(error);
    }
});

// أوامر الفويس النصية (مثل !join و !leave)
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content === '!join') {
        if (message.member.voice.channel) {
            const channel = message.member.voice.channel;
            joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });
            message.reply(`أبشر يا أرثر، دخلت روم: ${channel.name}`);
        } else {
            message.reply('يا بطل لازم تدخل روم صوتي أولاً عشان أقدر أجيك!');
        }
    } else if (message.content === '!leave') {
        const connection = getVoiceConnection(message.guild.id);
        if (connection) {
            connection.destroy();
            message.reply('تم الخروج من الروم الصوتي.');
        } else {
            message.reply('أنا أصلاً مو بأي روم صوتي!');
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ حدث خطأ أثناء تنفيذ الأمر.', ephemeral: true });
        }
    }
});

client.login(process.env.DISCORD_TOKEN || process.env.TOKEN);
