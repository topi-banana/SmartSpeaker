import whisper
import sys

model = whisper.load_model(sys.argv[1])
print('ready')
while True:
  fileName = input()
  if fileName == 'exit':
    sys.exit()
  result = model.transcribe(fileName)
  print(result["text"])