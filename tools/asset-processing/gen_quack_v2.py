"""
Tao quack bang 2 sinh rieng (quac 1 + quac 2) + mix
"""
import subprocess
from pathlib import Path

OUT = Path(r'C:\Users\nguye\bersious-web\assets\game\sfx\quack.mp3')
FFMPEG = 'ffmpeg'

# Tao 2 file tam: quack1.wav (0.18s) + quack2.wav (0.18s)
TMP1 = Path(r'C:\Users\nguye\AppData\Local\Temp\quack1.wav')
TMP2 = Path(r'C:\Users\nguye\AppData\Local\Temp\quack2.wav')

# 1 tieng quac: pitch contour xuong 500->300Hz, 3 harmonic, noise, AM 8Hz
def make_quack_sound(out_path, delay=0.0):
    expr = (
        f'0.5*sin(2*PI*(500-1100*t)*t) + '
        f'0.3*sin(2*PI*(1000-2200*t)*t) + '
        f'0.2*sin(2*PI*(1500-3300*t)*t) + '
        f'0.15*(random(0)-0.5)'  # noise (tieng hoi tho)
    )
    cmd = [
        FFMPEG, '-y', '-hide_banner', '-loglevel', 'error',
        '-f', 'lavfi',
        '-i', f'aevalsrc=({expr})*exp(-15*t)*sin(2*PI*8*t)*0.4+0.6:d=0.18',
        '-af', 'volume=2.0',
        str(out_path)
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    return r.returncode == 0

print('Tao quack 1...')
if not make_quack_sound(TMP1):
    print('FAIL quack1')
    raise SystemExit(1)

print('Tao quack 2...')
if not make_quack_sound(TMP2):
    print('FAIL quack2')
    raise SystemExit(1)

# Mix 2 file voi delay 0.22s cho quack 2
print('Mix thanh quack.mp3...')
cmd = [
    FFMPEG, '-y', '-hide_banner', '-loglevel', 'error',
    '-i', str(TMP1),
    '-i', str(TMP2),
    '-filter_complex', '[1]adelay=220|220[delayed];[0][delayed]amix=inputs=2:duration=longest:normalize=0,acompressor=threshold=-20dB:ratio=4',
    '-codec:a', 'libmp3lame', '-b:a', '96k',
    str(OUT)
]
r = subprocess.run(cmd, capture_output=True, text=True)
if r.returncode != 0:
    print(f'ERROR: {r.stderr}')
else:
    print(f'OK: {OUT.stat().st_size:,} bytes')

# Cleanup
for f in [TMP1, TMP2]:
    if f.exists():
        f.unlink()
