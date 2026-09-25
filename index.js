const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
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

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send(`
        <html style="background:#0f172a; color:#f8fafc; font-family:sans-serif; text-align:center; padding-top:50px;">
            <h1>🤖 ND • ARTHUR BOT - Master Dashboard</h1>
            <p>Status: <span style="color:#22c55e;">Online & Operational 24/7</span></p>
            <p>Music Panel & Games Suite: Active</p>
            <p>Owned by Arthur</p>
        </html>
    `);
});

app.listen(PORT, () => console.log(`Dashboard active on port ${PORT}`));

const OWNER_ID = process.env.OWNER_ID || ""; 
const VOICE_CHANNEL_ID = process.env.CHANNEL_ID || "";
const streaks = new Map();
let currentConnection = null;
let audioPlayer = createAudioPlayer();

// تسجيل الأوامر الشاملة
const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('فحص سرعة استجابة البوت'),
    new SlashCommandBuilder().setName('profile').setDescription('عرض بطاقة بروفايلك والستريك الخاص بك'),
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('تشغيل أغنية أو رابط يوتيوب لوحة الموسيقى')
        .addStringOption(option => option.setName('query').setDescription('رابط يوتيوب أو اسم الأغنية').setRequired(true)),
    // الألعاب الفردية والمرح
    new SlashCommandBuilder().setName('كت').setDescription('سؤال كت تويت عشوائي وممتع'),
    new SlashCommandBuilder().setName('لغز').setDescription('حل اللغز واختبر ذكاءك'),
    new SlashCommandBuilder().setName('رياضيات').setDescription('تحدي العمليات الحسابية السريعة'),
    new SlashCommandBuilder().setName('عقاب').setDescription('عقاب عشوائي للمتحدي'),
    new SlashCommandBuilder().setName('نکته').setDescription('اضحك مع نكتة جديدة'),
    // أوامر الإدارة
    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('مسح عدد معين من الرسائل (أدمن)')
        .addIntegerOption(option => option.setName('amount').setDescription('عدد الرسائل').setRequired(true)),
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('حظر عضو من السيرفر (أدمن)')
        .addUserOption(option => option.setName('target').setDescription('العضو المراد حظره').setRequired(true)),
    new SlashCommandBuilder().setName('owner-panel').setDescription('لوحة التحكم الخاصة بمالك البوت فقط')
].map(cmd => cmd.toJSON());

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity('🎮 Games & Music | /play');

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
        console.log('Successfully registered all Master Bot commands globally!');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
});

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

        // لوحة الموسيقى المحسنة
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

                let videoUrl = query;
                let videoTitle = query;

                if (!query.startsWith('http')) {
                    const ytInfo = await play.search(query, { limit: 1 });
                    if (!ytInfo || ytInfo.length === 0) {
                        return interaction.editReply('❌ لم يتم العثور على نتائج. جرب وضع رابط يوتيوب مباشر.');
                    }
                    videoUrl = ytInfo[0].url;
                    videoTitle = ytInfo[0].title;
                }

                const stream = await play.stream(videoUrl);
                const resource = createAudioResource(stream.stream, { inputType: stream.type });
                
                audioPlayer.play(resource);
                connection.subscribe(audioPlayer);

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
                    .setDescription(`جاري تشغيل: **${videoTitle}**\n\nتحكم بالأغنية عبر الأزرار أدناه!`)
                    .setFooter({ text: `طلب بواسطة: ${interaction.user.tag}` });

                return interaction.editReply({ embeds: [musicEmbed], components: [row1, row2] });
            } catch (err) {
                console.error(err);
                return interaction.editReply('⚠️ حدث خطأ أثناء تشغيل الملف الصوتي. تأكد من صحة الرابط.');
            }
        }

        // الألعاب
        if (commandName === 'كت') {
            const cutTweets = ['لو عندك قدرة تمسح سنة من حياتك مقابل مليون دولار، توافق؟', 'وش أكثر صفه تكرهها بالشخص اللي قدامك؟'];
            const randomCut = cutTweets[Math.floor(Math.random() * cutTweets.length)];
            const embed = new EmbedBuilder().setColor('#ff7675').setTitle('🎯 كت تويت').setDescription(randomCut);
            return interaction.reply({ embeds: [embed] });
        }

        if (commandName === 'لغز') {
            const embed = new EmbedBuilder().setColor('#fdcb6e').setTitle('🧩 لعبة الألغاز').setDescription('ما هو الشيء الذي يرفع شيئاً ثقيلاً ومع ذلك لا يقدر على مسمار؟ (البحر)');
            return interaction.reply({ embeds: [embed] });
        }

        if (commandName === 'رياضيات') {
            const n1 = Math.floor(Math.random() * 10) + 1;
            const n2 = Math.floor(Math.random() * 10) + 1;
            const embed = new EmbedBuilder().setColor('#0984e3').setTitle('🧮 تحدي الرياضيات').setDescription(`كم الناتج: **${n1} × ${n2}**؟`);
            return interaction.reply({ embeds: [embed] });
        }

        if (commandName === 'عقاب') {
            const embed = new EmbedBuilder().setColor('#d63031').setTitle('🎲 عقاب عشوائي').setDescription('عقابك: غير اسمك في الديسكورد إلى "متابع صامت" لمدة ساعة!');
            return interaction.reply({ embeds: [embed] });
        }

        if (commandName === 'نکته') {
            const embed = new EmbedBuilder().setColor('#e17055').setTitle('😂 نكتة سريعة').setDescription('واحد يزرع مسمار بالارض ليش؟ يبي يطلع شجرة سياكل!');
            return interaction.reply({ embeds: [embed] });
        }

        // الإدارة
        if (commandName === 'clear') {
            if (!interaction.member.permissions.has('ManageMessages')) return interaction.reply({ content: '❌ ليس لديك صلاحية!', ephemeral: true });
            const amount = interaction.options.getInteger('amount');
            await interaction.channel.bulkDelete(amount, true);
            return interaction.reply({ content: `🧹 تم مسح ${amount} رسالة.`, ephemeral: true });
        }

        if (commandName === 'ban') {
            if (!interaction.member.permissions.has('BanMembers')) return interaction.reply({ content: '❌ ليس لديك صلاحية!', ephemeral: true });
            const target = interaction.options.getUser('target');
            await interaction.guild.members.ban(target);
            return interaction.reply({ content: `🔨 تم حظر العضو بنجاح.` });
        }

        if (commandName === 'owner-panel') {
            if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: '🔒 لمالك البوت فقط!', ephemeral: true });
            return interaction.reply({ content: '👑 أهلاً بك يا مالك السيرفر والبووت!', ephemeral: true });
        }
    } 
    
    else if (interaction.isButton()) {
        const { customId } = interaction;
        if (customId === 'music_pause') { audioPlayer.pause(); return interaction.reply({ content: '⏸️ تم الإيقاف.', ephemeral: true }); }
        if (customId === 'music_resume') { audioPlayer.unpause(); return interaction.reply({ content: '▶️ تم الاستئناف.', ephemeral: true }); }
        if (customId === 'music_stop') { audioPlayer.stop(); return interaction.reply({ content: '⏹️ تم الإيقاف التام.', ephemeral: true }); }
        if (customId === 'music_disconnect') { if (currentConnection) currentConnection.destroy(); return interaction.reply({ content: '🚪 تم الفصل.', ephemeral: true }); }
        if (customId === 'music_queue') { return interaction.reply({ content: '📜 القائمة فارغة.', ephemeral: true }); }
    }
});

client.login(process.env.DISCORD_TOKEN);
