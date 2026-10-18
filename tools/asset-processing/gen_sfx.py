"""
Tao SFX bang ffmpeg (synth, khong can download)
- quack.mp3: tieng vit quac (saw wave + filter)
- thud.mp3: tieng va cham cot (noise burst + low-pass)
- win.mp3: tieng win (chord)
- fall.mp3: tieng rot xuong nuoc (splash)
"""
import subprocess
from pathlib import Path

OUT = Path(r'C:\Users\nguye\bersious-web\assets\game\sfx')
OUT.mkdir(parents=True, exist_ok=True)

FFMPEG = 'ffmpeg'  # trong PATH

def synth(name, ffmpeg_args):
    out = OUT / f'{name}.mp3'
    cmd = [FFMPEG, '-y', '-hide_banner', '-loglevel', 'error'] + ffmpeg_args + [
        '-codec:a', 'libmp3lame', '-b:a', '96k', str(out)
    ]
    print(f'Creating {name}.mp3 ...')
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f'  ERROR: {r.stderr}')
        return
    print(f'  OK: {out.stat().st_size:,} bytes')

# === quack.mp3 ===
# Tieng quac: sawtooth 350Hz -> 700Hz trong 0.15s (cu quac), 2 lan
# Dung vibrato + decay
synth('quack', [
    '-f', 'lavfi',
    '-i', (
        'aevalsrc=0.4*sin(2*PI*350*t)*exp(-15*t) + '
        '0.4*sin(2*PI*700*t)*exp(-15*(t-0.18)) + '
        '0.3*sin(2*PI*500*t)*exp(-20*(t-0.32)):'
        'd=0.5'
    ),
])

# === thud.mp3 ===
# Tieng bet (va cham): white noise burst, low-pass 800Hz, decay 0.3s
synth('thud', [
    '-f', 'lavfi',
    '-i', (
        'aevalsrc=0.6*sin(2*PI*80*t)*exp(-8*t) + '
        '0.4*(random(0)-0.5)*exp(-12*t):'
        'd=0.3'
    ),
    '-af', 'lowpass=f=1200,volume=1.5'
])

# === win.mp3 ===
# Tieng win: 3 note C-E-G (chord vui)
synth('win', [
    '-f', 'lavfi',
    '-i', (
        'aevalsrc='
        '0.4*sin(2*PI*523*t)*exp(-3*t) + '      # C5
        '0.4*sin(2*PI*659*t)*exp(-3*t) + '      # E5
        '0.4*sin(2*PI*784*t)*exp(-3*t) + '      # G5
        '0.3*sin(2*PI*1047*t)*exp(-3*(t-0.15)) + '  # C6
        '0.3*sin(2*PI*1319*t)*exp(-3*(t-0.15)):'  # E6
        'd=0.6'
    ),
])

# === fall.mp3 ===
# Tieng rot xuong nuoc: noise + low freq splash
synth('fall', [
    '-f', 'lavfi',
    '-i', (
        'aevalsrc='
        '0.5*(random(0)-0.5)*exp(-6*t) + '      # splash noise
        '0.3*sin(2*PI*200*t)*exp(-4*t) + '      # body
        '0.2*sin(2*PI*100*t)*exp(-3*t):'        # sub bass
        'd=0.5'
    ),
    '-af', 'lowpass=f=2000,volume=1.3'
])

# === collect.mp3 ===
# Tieng an item: short pleasant blip
synth('collect', [
    '-f', 'lavfi',
    '-i', (
        'aevalsrc='
        '0.4*sin(2*PI*800*t)*exp(-8*t) + '      # high blip
        '0.3*sin(2*PI*1200*t)*exp(-8*(t-0.05)):'  # higher
        'd=0.2'
    ),
])

print('\nAll SFX created!')
for f in sorted(OUT.iterdir()):
    print(f'  {f.name}: {f.stat().st_size:,} bytes')
