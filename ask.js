// ......
const { OpusEncoder } = require('@discordjs/opus')
const { encode } = require('wav-encoder')
const fs = require('fs')
// ......

const opusDecoder = new OpusEncoder(48000, 2)
connection.receiver.speaking.on('start', (userId) => {
  console.log(`Stream from user ${userId} started`)
  const audio = connection.receiver.subscribe(userId, {
    end: {
      behavior: EndBehaviorType.AfterSilence,
      duration: 500,
    },
  })
  const OpusStream = []
  
  audio.on('data', async (chunk) => {
    const pcmData = opusDecoder.decode(chunk)
    const decodedChunk = pcmData
    OpusStream.push(decodedChunk)
  })
  
  audio.on('end', async () => {
    console.log(`Stream from user ${userId} ended`)
    const wavData = await encode({
      format: 'wav',
      sampleRate: 48000,
      channelData: [new Float32Array(Buffer.concat(OpusStream).buffer)],
    })
    const filePath = `./tmp/${(new Date).getTime()}.wav`
    fs.writeFileSync(filePath, Buffer.from(wavData), { encoding: 'binary' })
    audio.destroy()
  })
})

// ......