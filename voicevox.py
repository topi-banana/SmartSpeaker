import requests
import json

#文字列の入力
text = "はい"
# 音声合成クエリの作成
res1 = requests.post('http://127.0.0.1:50021/audio_query', params = {'text': text, 'speaker': 1})
# 音声合成データの作成
res2 = requests.post('http://127.0.0.1:50021/synthesis', params = {'speaker': 1}, data=json.dumps(res1.json()))
# wavデータの生成
with open('test.wav', mode='wb') as f:
  f.write(res2.content)