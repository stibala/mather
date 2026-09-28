"""Measure real cat meows: duration, F0 contour, and spectral brightness.
Pure stdlib — no numpy here — so the FFT is hand-rolled."""
import wave, array, math, cmath, sys, glob, os

def fft(a):
    n = len(a)
    if n == 1: return a
    ev, od = fft(a[0::2]), fft(a[1::2])
    out = [0]*n
    for k in range(n//2):
        t = cmath.exp(-2j*math.pi*k/n) * od[k]
        out[k] = ev[k] + t
        out[k+n//2] = ev[k] - t
    return out

def load(path):
    w = wave.open(path)
    n, sr = w.getnframes(), w.getframerate()
    raw = array.array('h'); raw.frombytes(w.readframes(n))
    return [v/32768.0 for v in raw], sr

def rms_env(x, win, hop):
    return [math.sqrt(sum(v*v for v in x[i:i+win])/win) for i in range(0, len(x)-win, hop)]

def events(x, sr):
    """Contiguous stretches loud enough and long enough to be a call."""
    win, hop = 512, 128
    env = rms_env(x, win, hop)
    peak = max(env)
    on = [e > peak*0.13 for e in env]
    out, i = [], 0
    while i < len(on):
        if on[i]:
            j = i
            while j < len(on) and (on[j] or any(on[j:j+6])): j += 1
            if (j-i)*hop/sr > 0.18: out.append((i*hop, min(len(x), j*hop+win)))
            i = j
        else: i += 1
    return out

def analyse(x, sr, a, b):
    N, HOP = 1024, 256
    rows = []
    for i in range(a, b-N, HOP):
        fr = x[i:i+N]
        mean = sum(fr)/N
        fr = [(v-mean)*(0.5-0.5*math.cos(2*math.pi*k/(N-1))) for k, v in enumerate(fr)]
        if math.sqrt(sum(v*v for v in fr)/N) < 0.004: continue
        spec = fft(fr + [0.0]*N)
        power = [abs(c)**2 for c in spec[:N]]
        # F0 by autocorrelation, done through the spectrum
        ac = fft([complex(p, 0) for p in power + power[::-1]])
        ac = [c.real for c in ac[:N]]
        lo, hi = int(sr/1300), int(sr/180)
        if ac[0] <= 0: continue
        best = max(range(lo, min(hi, len(ac))), key=lambda L: ac[L])
        f0, clarity = sr/best, ac[best]/ac[0]
        tot = sum(power) or 1
        centroid = sum(k*sr/(2*N)*p for k, p in enumerate(power))/tot
        run, roll = 0, 0
        for k, p in enumerate(power):
            run += p
            if run >= tot*0.85: roll = k*sr/(2*N); break
        rows.append(((i-a)/sr, f0, clarity, centroid, roll))
    return rows

for path in sorted(glob.glob(sys.argv[1])):
    x, sr = load(path)
    print(f"\n=== {os.path.basename(path)}  {len(x)/sr:.2f}s ===")
    for (a, b) in events(x, sr):
        rows = [r for r in analyse(x, sr, a, b) if r[2] > 0.25]
        if len(rows) < 4: continue
        dur = (b-a)/sr
        f0s = [r[1] for r in rows]
        print(f"  call at {a/sr:5.2f}s  duration {dur:.2f}s   "
              f"F0 {min(f0s):.0f}-{max(f0s):.0f} Hz (range {max(f0s)-min(f0s):.0f}), mean {sum(f0s)/len(f0s):.0f}")
        print("     t/dur   F0    bright(85%)  centroid")
        for frac in (0.0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1.0):
            k = min(len(rows)-1, int(frac*(len(rows)-1)))
            t, f0, cl, cen, roll = rows[k]
            print(f"     {frac:4.2f}  {f0:5.0f}   {roll:7.0f}   {cen:8.0f}")
