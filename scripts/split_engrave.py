"""Split the PPS engrave OBJ into plate body + engraving floors (rendered as white print).
Usage: python3 -I split_engrave.py in.obj out_dir
Units in source: cm. Engraving floors: text at z=0.45, logo at z=0.495 (top face z=0.5)."""
import sys, json
src, out = sys.argv[1], sys.argv[2]
V = []; F = []
for l in open(src):
    if l.startswith('v '):
        V.append(tuple(map(float, l.split()[1:4])))
    elif l.startswith('f '):
        F.append([int(p.split('/')[0]) - 1 for p in l.split()[1:]])
body, prnt = [], []
for f in F:
    zs = [V[i][2] for i in f]
    (prnt if all(abs(z - zs[0]) < 1e-5 for z in zs) and 0.3 < zs[0] < 0.4999 else body).append(f)
def dump(faces, path):
    used = sorted({i for f in faces for i in f}); m = {o: n for n, o in enumerate(used)}
    with open(path, 'w') as fh:
        for o in used: fh.write('v %.5f %.5f %.5f\n' % V[o])
        for f in faces: fh.write('f ' + ' '.join(str(m[i] + 1) for i in f) + '\n')
    return len(used), len(faces)
print('body', dump(body, f'{out}/pps_body.obj'))
print('print', dump(prnt, f'{out}/pps_print.obj'))
# hole centres: find circular through-holes from vertices at z=0 grouped... (computed in a separate step)
