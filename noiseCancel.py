
from scipy.io import wavfile
import noisereduce as nr
# load data
rate, data = wavfile.read("tmp/5h28m26s.wav")
# perform noise reduction
reduced_noise = nr.reduce_noise(y=data, sr=rate, n_jobs=-1)
wavfile.write("mywav_reduced_noise.wav", rate, reduced_noise)