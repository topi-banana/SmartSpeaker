'''
from scipy.io import wavfile
import noisereduce as nr
# load data
rate, data = wavfile.read("./tmp/2h33m31s.wav")
# perform noise reduction
reduced_noise = nr.reduce_noise(y=data, sr=rate)
wavfile.write("./2h33m31s.wav", rate, reduced_noise)
'''

import numpy as np
from scipy.ndimage import maximum_filter1d


def envelope(y, rate, threshold):
  """
  Args:
    - y: 信号データ
    - rate: サンプリング周波数
    - threshold: 雑音判断するしきい値
  Returns:
    - mask: 振幅がしきい値以上か否か
    - y_mean: Sound Envelop
  """
  y_mean = maximum_filter1d(np.abs(y), mode="constant", size=rate//20)
  mask = [mean > threshold for mean in y_mean]
  return mask, y_mean

n_fft=2048  # STFTカラム間の音声フレーム数
hop_length=512  # STFTカラム間の音声フレーム数
win_length=2048  # ウィンドウサイズ
n_std_thresh=1.5  # 信号とみなされるために、ノイズの平均値よりも大きい標準偏差（各周波数レベルでの平均値のdB）が何個あるかのしきい値

def _stft(y, n_fft, hop_length, win_length):
    return librosa.stft(y=y, n_fft=n_fft, hop_length=hop_length, win_length=win_length)

def _amp_to_db(x):
    return librosa.core.amplitude_to_db(x, ref=1.0, amin=1e-20, top_db=80.0)

noise_stft = _stft(noise_clip, n_fft, hop_length, win_length)
noise_stft_db = _amp_to_db(np.abs(noise_stft))  # dBに変換する
   
mean_freq_noise = np.mean(noise_stft_db, axis=1)
std_freq_noise = np.std(noise_stft_db, axis=1)
noise_thresh = mean_freq_noise + std_freq_noise * n_std_thresh

n_grad_freq = 2  # マスクで平滑化する周波数チャンネルの数
n_grad_time = 4  # マスクを使って滑らかにする時間チャンネル数
prop_decrease = 1.0  # ノイズをどの程度減らすか

# 音源もSTFTで特徴量抽出する
sig_stft = _stft(audio_clip, n_fft, hop_length, win_length)
sig_stft_db = _amp_to_db(np.abs(sig_stft))

# 時間と頻度でマスクの平滑化フィルターを作成
smoothing_filter = np.outer(
        np.concatenate(
            [
                np.linspace(0, 1, n_grad_freq + 1, endpoint=False),
                np.linspace(1, 0, n_grad_freq + 2),
            ]
        )[1:-1],
        np.concatenate(
            [
                np.linspace(0, 1, n_grad_time + 1, endpoint=False),
                np.linspace(1, 0, n_grad_time + 2),
            ]
        )[1:-1],
    )
smoothing_filter = smoothing_filter / np.sum(smoothing_filter)

# 時間と周波数のしきい値の計算
db_thresh = np.repeat(
        np.reshape(noise_thresh, [1, len(mean_freq_noise)]),
        np.shape(sig_stft_db)[1],
        axis=0,
    ).T
sig_mask = sig_stft_db < db_thresh
sig_mask = scipy.signal.fftconvolve(sig_mask, smoothing_filter, mode="same")
sig_mask = sig_mask * prop_decrease