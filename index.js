const { Client, GatewayIntentBits, REST, Routes, Collection } = require('discord.js');
const { GoogleGenAI } = require('@google/genai');
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// إعداد سيرفر الويب (لوالدك Dashboard/Render)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Arthur & Joud Discord Bot is running live!');
});

app.listen(PORT, () => {
    console.log(`🌐 Web server is running on port ${PORT}`);
});

// إعداد عميل ديسكورد (Discord Client)
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

client.commands = new Collection();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// تحميل أمر الذكاء الاصطناعي من مجلد commands
const aiCommandPath = path.join(__dirname, 'commands', 'ai.js');
if (fs.existsSync(aiCommandPath)) {
    const aiCommand = require(aiCommandPath);
    if ('data' in aiCommand && 'execute' in aiCommand) {
        client.commands.set(aiCommand.data.name, aiCommand);
    }
}

client.once('ready', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}!`);

    // تسجيل أوامر السلاش تلقائياً في ديسكورد
    const commands = [];
    client.commands.forEach(cmd => commands.push(cmd.data.toJSON()));

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
});

// التعامل مع تنفيذ الأوامر
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        const errorMessage = '❌ حدث خطأ أثناء تنفيذ هذا الأمر.';
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
});

// تسجيل الدخول بالبوت
client.login(process.env.TOKEN);
