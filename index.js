const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, entersState, VoiceConnectionStatus } = require('@discordjs/voice');
const express = require('express');
const dotenv = require('dotenv');
const play = require('play-dl');

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers
    ]
});

// خادم الويب للداشبورد والإبقاء 24/7
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send(`
        <html style="background:#0f172a; color:#f8fafc; font-family:sans-serif; text-align:center; padding-top:50px;">
            <h1>🤖 ND • ARTHUR BOT - Master Dashboard</h1>
            <p>Status: <span style="color:#22c55e;">Online & Operational 24/7</span></p>
            <p>Music Panel & Voice 24/7: Active</p>
            <p>Owned by Arthur</p>
        </html>
    `);
});

app.listen(PORT, () => console.log(`Dashboard active on port ${PORT}`));

const OWNER_ID = process.env.OWNER_ID || ""; 
const VOICE_CHANNEL_ID = process.env.CHANNEL_ID || "";
const streaks = new Map();
const queue = [];
let currentConnection = null;
let audioPlayer = createAudioPlayer();

// تسجيل الأوامر
const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('فحص سرعة استجابة البوت'),
    new SlashCommandBuilder().setName('profile').setDescription('عرض بطاقة بروفايلك والستريك الخاص بك'),
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('تشغيل أغنية أو فتح لوحة الموسيقى التفاعلية')
        .addStringOption(option => option.setName('query').setDescription('اسم الأغنية أو رابط يوتيوب').setRequired(true)),
    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('مسح عدد معين من الرسائل (أدمن)')
        .addIntegerOption(option => option.setName('amount').setDescription('عدد الرسائل').setRequired(true)),
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('حظر عضو من السيرفر (أدمن)')
        .addUserOption(option => option.setName('target').setDescription('العضو المراد حظره').setRequired(true)),
    new SlashCommandBuilder().setName('flag-game').setDescription('بدء لعبة تخمين أعلام الدول'),
    new SlashCommandBuilder().setName('owner-panel').setDescription('لوحة التحكم الخاصة بمالك البوت فقط')
].map(cmd => cmd.toJSON());

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity('🎵 Music & Moderation | /play');

    // الانضمام للروم الصوتي المخصص 24/7
    if (VOICE_CHANNEL_ID) {
        const channel = await client.channels.fetch(VOICE_CHANNEL_ID).catch(() => null);
        if (channel && channel.isVoiceBased()) {
            try {
                currentConnection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: channel.guild.id,
                    adapterCreator: channel.guild.voiceAdapterCreator,
                    selfDeaf: false,
                    selfMute: true
                });
                console.log(`Successfully joined 24/7 voice channel: ${channel.name}`);
            } catch (error) {
                console.error('Failed to join voice channel:', error);
            }
        }
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully registered all Slash Commands globally!');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
});

// نظام التفاعل والأوامر
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        if (commandName === 'ping') {
            return interaction.reply({ content: `🏓 Pong! WebSocket Latency: **${client.ws.ping}ms**`, ephemeral: true });
        }

        if (commandName === 'profile') {
            const userId = interaction.user.id;
            const userStreak = streaks.get(userId) || 0;
            const isOwner = userId === OWNER_ID;

            const profileEmbed = new EmbedBuilder()
                .setColor(isOwner ? '#FFD700' : '#0099ff')
                .setTitle(`👤 البروفايل الشخصي: ${interaction.user.username}`)
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    { name: '🔥 الستريك اليومي', value: `${userStreak} أيام`, inline: true },
                    { name: '👑 الرتبة الخاصة', value: isOwner ? 'مالك البوت (Bot Owner VIP)' : 'عضو مجتمع', inline: true }
                )
                .setFooter({ text: 'ND • ARTHUR BOT' })
                .setTimestamp();

            return interaction.reply({ embeds: [profileEmbed] });
        }

        if (commandName === 'play') {
            const query = interaction.options.getString('query');
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) {
                return interaction.reply({ content: '❌ يجب أن تكون متواجدًا في روم صوتي لاستخدام أمر الموسيقى!', ephemeral: true });
            }

            await interaction.deferReply();

            try {
                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                });

                const ytInfo = await play.search(query, { limit: 1 });
                if (!ytInfo || ytInfo.length === 0) {
                    return interaction.editReply('❌ لم يتم العثور على نتائج مطابقة لبحثك.');
                }

                const stream = await play.stream(ytInfo[0].url);
                const resource = createAudioResource(stream.stream, { inputType: stream.type });
                
                audioPlayer.play(resource);
                connection.subscribe(audioPlayer);

                // بناء أزرار لوحة التحكم التفاعلية (Music Panel Buttons)
                const row1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('music_play').setLabel('Play').setStyle(ButtonStyle.Success).setEmoji('▶️'),
                    new ButtonBuilder().setCustomId('music_pause').setLabel('Pause').setStyle(ButtonStyle.Secondary).setEmoji('⏸️'),
                    new ButtonBuilder().setCustomId('music_resume').setLabel('Resume').setStyle(ButtonStyle.Primary).setEmoji('🟢'),
                    new ButtonBuilder().setCustomId('music_skip').setLabel('Skip').setStyle(ButtonStyle.Secondary).setEmoji('⏭️')
                );

                const row2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('music_stop').setLabel('Stop & clear').setStyle(ButtonStyle.Danger).setEmoji('⏹️'),
                    new ButtonBuilder().setCustomId('music_disconnect').setLabel('Disconnect bot').setStyle(ButtonStyle.Danger).setEmoji('🚪'),
                    new ButtonBuilder().setCustomId('music_queue').setLabel('Queue').setStyle(ButtonStyle.Secondary).setEmoji('📜')
                );

                const musicEmbed = new EmbedBuilder()
                    .setColor('#10b981')
                    .setTitle('🎶 Panel de música / لوحة الموسيقى')
                    .setDescription(`جاري تشغيل: **${ytInfo[0].title}**\n\nأهلاً بك في لوحة تحكم الأغاني الخاصة ببوت **ND • ARTHUR BOT**. استخدم الأزرار أدناه للتحكم الكامل!`)
                    .setFooter({ text: `طلب بواسطة: ${interaction.user.tag}` });

                return interaction.editReply({ embeds: [musicEmbed], components: [row1, row2] });
            } catch (err) {
                console.error(err);
                return interaction.editReply('⚠️ حدث خطأ أثناء تشغيل الملف الصوتي.');
            }
        }

        if (commandName === 'clear') {
            if (!interaction.member.permissions.has('ManageMessages')) {
                return interaction.reply({ content: '❌ ليس لديك صلاحية مسح الرسائل!', ephemeral: true });
            }
            const amount = interaction.options.getInteger('amount');
            await interaction.channel.bulkDelete(amount, true);
            return interaction.reply({ content: `🧹 تم مسح **${amount}** رسالة بنجاح.`, ephemeral: true });
        }

        if (commandName === 'ban') {
            if (!interaction.member.permissions.has('BanMembers')) {
                return interaction.reply({ content: '❌ ليس لديك صلاحية حظر الأعضاء!', ephemeral: true });
            }
            const target = interaction.options.getUser('target');
            await interaction.guild.members.ban(target);
            return interaction.reply({ content: `🔨 تم حظر العضو **${target.tag}** بنجاح من السيرفر.` });
        }

        if (commandName === 'owner-panel') {
            if (interaction.user.id !== OWNER_ID) {
                return interaction.reply({ content: '🔒 هذا الأمر مخصص لمالك البوت فقط!', ephemeral: true });
            }
            return interaction.reply({ content: '👑 أهلاً بك يا مالك السيرفر والبووت! مركز التحكم الكامل جاهز.', ephemeral: true });
        }
    } 
    
    // التعامل مع ضغطات أزرار لوحة الموسيقى
    else if (interaction.isButton()) {
        const { customId } = interaction;
        if (customId === 'music_pause') {
            audioPlayer.pause();
            return interaction.reply({ content: '⏸️ تم إيقاف الموسيقى مؤقتاً.', ephemeral: true });
        }
        if (customId === 'music_resume') {
            audioPlayer.unpause();
            return interaction.reply({ content: '▶️ تم استئناف الموسيقى.', ephemeral: true });
        }
        if (customId === 'music_stop') {
            audioPlayer.stop();
            return interaction.reply({ content: '⏹️ تم إيقاف وتشغيل تفريغ مشغل الموسيقى.', ephemeral: true });
        }
        if (customId === 'music_disconnect') {
            if (currentConnection) currentConnection.destroy();
            return interaction.reply({ content: '🚪 تم فصل البوت عن الروم الصوتي.', ephemeral: true });
        }
        if (customId === 'music_queue') {
            return interaction.reply({ content: '📜 قائمة الانتظار فارغة حالياً.', ephemeral: true });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
