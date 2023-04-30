const { joinVoiceChannel, EndBehaviorType, entersState, VoiceConnectionStatus, createAudioResource, StreamType, createAudioPlayer, AudioPlayerStatus, NoSubscriberBehavior, generateDependencyReport } = require('@discordjs/voice')
const { OpusEncoder } = require('@discordjs/opus')
const { encode } = require('wav-encoder')
const fs = require('fs')
console.log(generateDependencyReport())
const Discord = require('discord.js')
const client = new Discord.Client({
  intents: Object.values(Discord.GatewayIntentBits),
  partials: Object.values(Discord.Partials),
})

require('dotenv').config()

client.on('ready', async () => {
  console.log('Ready')
})
client.on('messageCreate', async interaction => {
  if (interaction.content != '!test') return

  const voiceChannel = interaction.member.voice.channel
  if (!voiceChannel) {
    return interaction.reply({
      content: '接続先のVCが見つかりません。',
      ephemeral: true,
    })
  } else
  if (!voiceChannel.joinable) {
    return interaction.reply({
      content: 'VCに接続できません。',
      ephemeral: true,
    })
  } else
  if (!voiceChannel.speakable) {
    return interaction.reply({
      content: 'VCで音声を再生する権限がありません。',
      ephemeral: true,
    })
  }
  interaction.reply({
    content: '接続しています',
    ephemeral: true,
  })
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: false
  })
  const player = createAudioPlayer()
  connection.subscribe(player)
  const VCconfig = {
    duration: 500,
    isNow: false,
    decode: {
      rate: 48000,
      channel: 2
    },
    encode: {
      rate: 48000,
      //channel: 2,
    }
  }
  console.log(VCconfig)
  connection.receiver.speaking.on('start', (userId) => {
    if (VCconfig.isNow) return
    VCconfig.isNow = true
    console.log(`Stream from user ${userId} has started`)
    const audio = connection.receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: VCconfig.duration,
      },
    });
    const OpusStream = []
    
    audio.on('data', (chunk) => {
      const decodedChunk = new Promise((resolve, reject) => {
        const opusDecoder = new OpusEncoder(VCconfig.decode.rate, VCconfig.decode.channel);
        const pcmData = opusDecoder.decode(chunk);
        resolve(pcmData);
      })
      OpusStream.push(decodedChunk)
    });
    
    audio.on('end', async () => {
      VCconfig.isNow = false
      console.log(`Stream from user ${userId} has ended`);
      const wavData = await encode({
        format: 'wav',
        sampleRate: VCconfig.encode.rate,
        channelData: [new Float32Array(Buffer.concat(await Promise.all(OpusStream)).buffer)],
      });
      const now = new Date();
      const fileName = `${now.getHours()}h${now.getMinutes()}m${now.getSeconds()}s.wav`;
      const filePath = `./tmp/${fileName}`;
      
      fs.writeFileSync(filePath, Buffer.from(wavData), { encoding: 'binary' });
      console.log(fileName)
      //whisper(player,filePath);
      audio.destroy();
    });
  });
})

client.login(process.env.DISCORD_TOKEN)