const { joinVoiceChannel, EndBehaviorType, entersState, VoiceConnectionStatus, createAudioResource, StreamType, createAudioPlayer, AudioPlayerStatus, NoSubscriberBehavior, generateDependencyReport } = require('@discordjs/voice')
const { OpusEncoder } = require('@discordjs/opus')
const wav = require('wav')
const fs = require('fs')
const request = require('request')
console.log(generateDependencyReport())
const Discord = require('discord.js')
const client = new Discord.Client({
  intents: Object.values(Discord.GatewayIntentBits),
  partials: Object.values(Discord.Partials),
})

require('dotenv').config()

if( !process.env.WHISPER_HOST ){
  throw '[ERROR] env:WHISPER_HOST not found'
}else{
  new URL(process.env.WHISPER_HOST)
}

if( process.env.UNLINK_CACHE.toLowerCase() == 'true' ){
  process.env.UNLINK_CACHE = true
}else
if( process.env.UNLINK_CACHE.toLowerCase() == 'false' ){
  process.env.UNLINK_CACHE = false
}else{
  throw `[ERROR] env:UNLINK_CACHE="${process.env.UNLINK_CACHE}" is invalid value`
}

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
  let now = false
  //const player = createAudioPlayer()
  //connection.subscribe(player)
  const format = {
    audioFormat: 1, // PCM
    channels: 1, // モノラル
    sampleRate: 48000, // サンプリングレート
    byteRate: 48000 * 2, // サンプリングレート * 1チャンネルあたりのバイト数
    blockAlign: 2, // 1チャンネルあたりのバイト数
    bitsPerSample: 16 // 量子化ビット数
  }
  const opusDecoder = new OpusEncoder(format.sampleRate, format.channels)
  connection.receiver.speaking.on('start', async (userId) => {
    if (now) return
    now = true
    const user = await client.users.fetch(userId)
    if (user.bot) return
    console.log(`Stream from user ${user.username} started`)
    const audio = connection.receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: 200,
      },
    })
    
    const filePath = `./tmp/${(new Date).getTime()}.wav`
    const file = fs.createWriteStream(filePath)
    const writer = new wav.Writer(format)
    writer.pipe(file)

    audio.on('data', async (chunk) => {
      const pcmData = opusDecoder.decode(chunk)
      writer.write(pcmData)
    })
    
    audio.on('end', async () => {
      console.log(`Stream from user ${userId} ended`)
      now = false
      writer.end(async () => {
        file.close()
        console.log((new Date).getTime())
        // use Docker image -> [onerahmet/openai-whisper-asr-webservice]
        let url = new URL('asr', process.env.WHISPER_HOST)
        url.searchParams = new URLSearchParams({
          method: 'openai-whisper',
          task: 'transcribe',
          encode: 'true',
          output: 'txt',
          language: process.env.WHISPER_LANG,
        })
        request({
          url: url,
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'multipart/form-data'
          },
          formData: {audio_file: fs.createReadStream(filePath)}
        },(err, res, body='') => {
          console.log((new Date).getTime())
          body = body.trim()
          if (!body) return
          interaction.channel.send(body)
          if ( !process.env.UNLINK_CACHE ) return
          fs.unlink(filePath, err => {
            if (err) throw err;
            console.log('Deleted')
          })
        })
      })
      audio.destroy()
    })
  })
})

client.login(process.env.DISCORD_TOKEN)

process.on('exit', exitCode => {
  //whisper.send('exit')
})
process.on('SIGINT', () => process.exit(0))