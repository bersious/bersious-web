"""
Tao thud.mp3 - tieng "bet" (impact) that
Cu: 80Hz sine + noise (nghe qua nhe)
Moi: low freq 60Hz + noise burst + crack (high freq) giong va cham that
"""
import subprocess
from pathlib import Path

OUT = Path(r'C:\Users\nguye\bersious-web\assets\game\sfx\thud.mp3')
FFMPEG = 'ffmpeg'

# thud: 0.3s
# - Low freq 60Hz (body impact)
# - Noise burst (attack - tien cong)
# - High freq crack 2kHz nhanh (impact transient)
expr = (
    '0.7*sin(2*PI*60*t)*exp(-6*t) + '  # body
    '0.5*(random(0)-0.5)*exp(-15*t) + '  # noise attack
    '0.4*sin(2*PI*2000*t)*exp(-25*t)'  # crack high
)

cmd = [
    FFMPEG, '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'lavfi',
    '-i', f'aevalsrc=({expr}):d=0.3',
    '-af', 'lowpass=f=2500,volume=1.8,acompressor=threshold=-15dB:ratio=3',
    '-codec:a', 'libmp3lame', '-b:a', '96k',
    str(OUT)
]
print(f'Creating thud.mp3...')
r = subprocess.run(cmd, capture_output=True, text=True)
if r.returncode != 0:
    print(f'ERROR: {r.stderr}')
else:
    print(f'OK: {OUT.stat().st_size:,} bytes')
