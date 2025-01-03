
//%block="Aztec"
//%color="#11bf6b"
//%icon="\uf02a"
namespace aztec {

    function charCodeArr(narr:number[]) {
        let ustr = ""
        for (let i = 0;i < narr.length;i++) {
            ustr = "" + ustr + String.fromCharCode(narr[i])
        }
        return ustr
    }

    function addNumArr(len:number) {
        let nar:number[] = []
        for (let i = 0;i < len;i++) {
            nar.push(0)
        }
        return nar
    }

    function azgen(text:string, sec:number, lay:number):number[][] { // make Aztec bar code
        let e = 20000;let BackTo, numBytes=0, CharSiz = [5, 5, 5, 5, 4];
        let LatLen = [[0, 5, 5, 10, 5, 10], [9, 0, 5, 10, 5, 10], [5, 5, 0, 5, 10, 10],
        [5, 10, 10, 0, 10, 15], [4, 9, 9, 14, 0, 14], [0, 0, 0, 0, 0, 0]];
        let ShftLen = [[0, e, e, 5, e], [5, 0, e, 5, e], [e, e, 0, 5, e], [e, e, e, 0, e], [4, e, e, 4, 0]];
        let Latch = [[[], [28], [29], [29, 30], [30], [31]], // from upper to ULMPDB
        [[30, 14], [], [29], [29, 30], [30], [31]], //      lower
        [[29], [28], [], [30], [28, 30], [31]], //      mixed
        [[31], [31, 28], [31, 29], [], [31, 30], [31, 31]], //   punct
        [[14], [14, 28], [14, 29], [14, 29, 30], [], [14, 31]]]; //  digit
        let CharMap: string[] = ["  ABCDEFGHIJKLMNOPQRSTUVWXYZ", // upper
            "  abcdefghijklmnopqrstuvwxyz", // lower
            charCodeArr([0, 32, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 7, 28, 29, 30, 31, 64, 92, 94, 95, 96, 124, 126, 127]), // mixed
            " \r\r\r\r\r!\"#$%&'()*+,-./:;<=>?[]{}", // punct
            "  0123456789,."]; // digit
        let enc:number[] = [], el=text.length, a:number, b:number, typ = 0, x=0, y=0, ctr=0, c=0, i=0, j=0, l=0;

        let stream = function(seq:number[], val:number, bits:number) { // add data to bit stream 
            let eb = seq[0] % b + bits; // first element is length in bits
            val <<= b; seq[0] += bits; // b - word size in bits
            seq[seq.length - 1] |= val >> eb; // add data
            while (eb >= b) { // word full?
                bits = seq[seq.length - 1] >> 1;
                if (typ == 0 && (bits == 0 || 2 * bits + 2 == 1 << b)) { // bit stuffing: all 0 or 1
                    seq[seq.length - 1] = 2 * bits + (1 & bits ^ 1); // insert complementary bit
                    seq[0]++; eb++;
                }
                eb -= b;
                seq.push((val >> eb) & ((1 << b) - 1));
            }
        }
        let binary = function(seq:number[], pos:number) { // encode numBytes of binary
            seq[0] -= numBytes * 8 + (numBytes > 31 ? 16 : 5); // stream() adjusts len too -> remove
            stream(seq, numBytes > 31 ? 0 : numBytes, 5); // len
            if (numBytes > 31) stream(seq, numBytes - 31, 11); // long len
            for (let i = pos - numBytes; i < pos; i++)
                stream(seq, text.charCodeAt(i), 8); // bytes
        }
        /** encode text */
        sec = 100 / (100 - Math.min(Math.max(sec || 25, 0), 90)); // limit percentage of check words to 0-90%
        for (j = c = 4; ; c = b) { // compute word size b: 6/8/10/12 bits
            j = Math.max(j, (Math.floor(el * sec) + 3) * c); // total needed bits, at least 3 check words
            b = j <= 240 ? 6 : j <= 1920 ? 8 : j <= 10208 ? 10 : 12; // bit capacity -> word size
            if (lay) b = Math.max(b, lay < 3 ? 6 : lay < 9 ? 8 : lay < 23 ? 10 : 12); // parameter
            if (c >= b) break; // fits in word size

            let Cur = [[0, 0], [e], [e], [e], [e], [e]]; // current sequence for [U,L,M,P,D,B]
            for (i = 0; i < text.length; i++) { // calculate shortest message sequence
                for (let to = 0; to < 6; to++) // check for shorter latch to
                    for (let frm = 0; frm < 6; frm++) // if latch from
                        if (Cur[frm][0] + LatLen[frm][to] < Cur[to][0] && (frm < 5 || to == BackTo)) {
                            Cur[to] = Cur[frm].slice(); // replace by shorter sequence
                            if (frm < 5) // latch from shorter mode
                                Latch[frm][to].forEach(function (lat) { stream(Cur[to], lat, lat < 16 ? 4 : 5); });
                            else
                                binary(Cur[to], i); // return from binary -> encode
                            if (to == 5) { BackTo = frm; numBytes = 0; Cur[5][0] += 5; } // begin binary shift
                        }
                let Nxt = [[e], [e], [e], [e], [e], Cur[5]]; // encode char
                let twoChar = ["\r\n", ". ", ", ", ": "].indexOf(text.substr(i, 2)); // special 2 char sequences
                for (let to = 0; to < 5; to++) { // to sequence
                    let idx = twoChar < 0 ? CharMap[to].indexOf(text.substr(i, 1), 1) : twoChar + 2; // index to map
                    if (idx < 0 || (twoChar >= 0 && to != 3)) continue; // char in set ?
                    for (let frm = 0; frm < 5; frm++) // encode char
                        if (Cur[frm][0] + ShftLen[frm][to] + CharSiz[to] < Nxt[frm][0]) {
                            Nxt[frm] = Cur[frm].slice();
                            if (frm != to) // add shift
                                stream(Nxt[frm], to == 3 ? 0 : frm < 4 ? 28 : 15, CharSiz[frm]);
                            stream(Nxt[frm], idx, CharSiz[to]); // add char
                        }
                }
                Nxt[5][0] += numBytes++ == 31 ? 19 : 8; // binary exeeds 31 bytes
                if (twoChar >= 0) { i++; Nxt[5][0] += numBytes++ == 31 ? 19 : 8; } // 2 char seq: jump over 2nd
                Cur = Nxt; // take next sequence
            }
            binary(Cur[5], text.length); // encode remaining bytes
            enc = Cur.reduce(function(a:number[],b:number[]):number[] { return a[0] < b[0] ? a : b;},enc) // get shortest sequence
            i = b - enc[0] % b; if (i < b) stream(enc, (1 << i) - 1, i); // padding
            enc.pop(); // remove 0-byte
            el = enc.shift() / b | 0; // get encoding length
        }
        if (el > 1660) return [[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1]]; // message too long
        typ = j > 608 || el > 64 || (lay && lay > 4) ? 14 : 11; // full or compact Aztec finder size
        let mod = parseInt(text); // Aztec rune possible?
        if (mod < 0 || mod > 255 || mod + "" != text || lay != 0) // Aztec rune 0-255 ?
            lay = Math.max(lay || 1, Math.min(32, (Math.ceil((Math.sqrt(j + typ * typ) - typ) / 4)))); // needed layers
        let ec = Math.floor((8 * lay * (typ + 2 * lay)) / b) - el; // # of error words
        typ >>= 1; ctr = typ + 2 * lay; ctr += (ctr - 1) / 15 | 0; // center position

        /** compute Reed Solomon error detection and correction */
        let rs = function(ec:number, s:number, p:number) { // # of checkwords, polynomial bit size, generator polynomial
            let rc = addNumArr(ec + 2), i=0, j=0, el = enc.length; // reed/solomon code
            let lg = addNumArr(s + 1), ex = addNumArr(s); // log/exp table for multiplication
            for (j = 1, i = 0; i < s; i++) { // compute log/exp table of Galois field
                ex[i] = j; lg[j] = i;
                j += j; if (j > s) j ^= p; // GF polynomial
            }
            for (rc[ec + 1] = i = 0; i <= ec; i++) // compute RS generator polynomial
                for (j = ec - i, rc[j] = 1; j++ < ec;)
                    rc[j] = rc[j + 1] ^ ex[(lg[rc[j]] + i) % s];
            for (i = 0; i < el; i++) // compute RS checkwords
                for (j = 0, p = enc[el] ^ enc[i]; j++ < ec;)
                    enc[el + j - 1] = enc[el + j] ^ (p ? ex[(lg[rc[j]] + lg[p]) % s] : 0);
        }
        /** layout Aztec barcode */
        let mat = addNumArr(2 * ctr + 1).fill(0).map(function () { return []; });
        for (y = 1 - typ; y < typ; y++) // layout central finder
            for (x = 1 - typ; x < typ; x++)
                mat[ctr + y][ctr + x] = Math.max(Math.abs(x), Math.abs(y)) & 1 ^ 1;
        mat[ctr - typ + 1][ctr - typ] = mat[ctr - typ][ctr - typ] = 1; // orientation marks
        mat[ctr - typ][ctr - typ + 1] = mat[ctr + typ - 1][ctr + typ] = 1;
        mat[ctr - typ + 1][ctr + typ] = mat[ctr - typ][ctr + typ] = 1;
        let move = function(dx:number, dy:number) { // move one cell
            do x += dx; while (typ == 7 && (x & 15) == 0); // skip reference grid
            do y += dy; while (typ == 7 && (y & 15) == 0);
        }
        if (lay > 0) { // layout the message
            rs(ec, (1 << b) - 1, [67, 301, 1033, 4201][b / 2 - 3]); // error correction, generator polynomial
            x = -typ; y = x - 1; // start of layer 1 at top left
            j = l = (3 * typ + 9) / 2; // length of inner side
            let dx = 1, dy = 0; // direction right
            while ((c = enc.pop()) !== undefined) // data in reversed order inside to outside
                for (i = b / 2; i-- > 0; c >>= 2) {
                    if (c & 1) mat[ctr + y][ctr + x] = 1; // odd bit
                    move(dy, -dx); // move across
                    if (c & 2) mat[ctr + y][ctr + x] = 1; // even bit
                    move(dx - dy, dx + dy); // move ahead
                    if (j-- == 0) { // spiral turn
                        move(dy, -dx); // move across
                        j = dx; dx = -dy; dy = j; // rotate clockwise
                        if (dx < 1) // move to next side
                            for (j = 2; j--;) move(dx - dy, dx + dy);
                        else l += 4; // full turn -> next layer
                        j = l; // start new side
                    }
                }
            if (typ == 7) // layout reference grid
                for (x = (15 - ctr) & -16; x <= ctr; x += 16)
                    for (y = (1 - ctr) & -2; y <= ctr; y += 2)
                        mat[ctr + y][ctr + x] = mat[ctr + x][ctr + y] = 1;
            mod = (lay - 1) * (typ * 992 - 4896) + el - 1; // 2/5 + 6/11 mode bits
        }
        /** process modes message compact/full */
        b = (typ * 3 - 1) / 2; // 7/10 bits per side
        for (i = typ - 2; i-- > 0; mod >>= 4) enc[i] = mod & 15; // mode to 4 bit words
        rs((typ + 5) / 2, 15, 19); // add 5/6 words error correction
        enc.push(0); j = lay ? 0 : 10; // XOR Aztec rune data
        for (i = 1; i <= b; i++) stream(enc, j ^ enc[i], 4); // 8/16 words to 4 sides
        for (i = 2 - typ, j = 1; i < typ - 1; i++, j += j) { // layout mode data
            if (typ == 7 && i == 0) i++; // skip reference grid
            if (enc[b + 1] & j) mat[ctr - typ][ctr - i] = 1; // top
            if (enc[b + 2] & j) mat[ctr - i][ctr + typ] = 1; // right
            if (enc[b + 3] & j) mat[ctr + typ][ctr + i] = 1; // bottom
            if (enc[b + 4] & j) mat[ctr + i][ctr - typ] = 1; // left
        }
        return mat; // matrix Aztec barcode
    }

    function stampImage(src: Image, to: Image, x: number, y: number) {
        if (!src || !to) { return; }
        to.drawTransparentImage(src, x, y)
    }

    function sumbit(text:string="",subnum:number=1,renum:number=1,idxsum:boolean=false) {
        if (renum < 1) {renum = 1}
        if (subnum < 1) {subnum = 1}
        let v = 0
        for (let i = 0;i < text.length;i++) {
            if (idxsum) { v += (text.charCodeAt(i) * i+1) / subnum}
            else { v += text.charCodeAt(i) / subnum}
        }
        v = v / ((renum ^ subnum) * (v / renum))
        return v
    }

    //%blockid=aztec_createaztecimage
    //%block="create aztec image by| text $text gap $gap|| ec level $eclevel layer $layer"
    //%text.defl="MAKECODE-ARCADE"
    //%gap.defl=4
    //%eclevel.min=1 eclevel.max=4 eclevel.defl=2
    //%layer.min=1 layer.max=32 layer.defl=4
    //%group="image"
    //%weight=10
    export function genimg(text:string="",gap:number=4,eclevel:number=null,layer:number=null) {
        if(eclevel === null) {eclevel = Math.min(Math.floor(Math.sqrt(sumbit(text,3.14,1.16) / ((3.14 * 3) / 4))),4)}
        if(layer === null) {layer = Math.floor(Math.sqrt(sumbit(text,3.14,1.16) / (3.14 / 2)))}
        let outputnll: number[][] = azgen(text,eclevel,layer)
        let outputimg: Image = image.create(outputnll[0].length,outputnll.length)
        let bin = 0
        outputimg.fill(1)
        for (let y = 0;y < outputnll.length;y++) {
            for (let x = 0;x < outputnll[y].length;x++) {
                bin = outputnll[y][x]
                if (bin > 0) outputimg.setPixel(x,y,15);
            }
        }
        let outputgap: Image = image.create(outputimg.width + (gap * 2),outputimg.height + (gap * 2))
        outputgap.fill(1)
        stampImage(outputimg,outputgap,gap,gap)
        return outputgap
    }
}
