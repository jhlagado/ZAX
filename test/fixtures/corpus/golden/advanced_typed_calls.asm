; ZAX lowered .asm trace
; range: $0000..$005A (end exclusive)

; func main begin
main:
0000: F5           push AF
0001: C5           push BC
0002: D5           push DE
0003: DD E5        push IX
0005: FD E5        push IY
0007: E5           push HL
0008: 21 01 00     ld HL, $0001
000B: E5           push HL
000C: CD 00 00     db $CD, lo(ping), hi(ping)
000F: C1           pop BC
0010: E1           pop HL
0011: FD E1        pop IY
0013: DD E1        pop IX
0015: D1           pop DE
0016: C1           pop BC
0017: F1           pop AF
0018: F5           push AF
0019: C5           push BC
001A: D5           push DE
001B: DD E5        push IX
001D: FD E5        push IY
001F: 3A 00 00     db $3A, lo(idx), hi(idx)
0022: 26 00        ld H, $0000
0024: 6F           ld L, A
0025: E5           push HL
0026: E1           pop HL
0027: E5           push HL
0028: 21 00 00     db $21, lo(arr), hi(arr)
002B: D1           pop DE
002C: 19           add HL, DE
002D: E5           push HL
002E: E1           pop HL
002F: 7E           ld a, (hl)
0030: 26 00        ld H, $0000
0032: 6F           ld L, A
0033: E5           push HL
0034: CD 00 00     db $CD, lo(getb), hi(getb)
0037: C1           pop BC
0038: FD E1        pop IY
003A: DD E1        pop IX
003C: D1           pop DE
003D: C1           pop BC
003E: F1           pop AF
003F: 7D           ld A, L
0040: F5           push AF
0041: C5           push BC
0042: D5           push DE
0043: DD E5        push IX
0045: FD E5        push IY
0047: 21 09 00     ld HL, $0009
004A: E5           push HL
004B: CD 00 00     db $CD, lo(getw), hi(getw)
004E: C1           pop BC
004F: FD E1        pop IY
0051: DD E1        pop IX
0053: D1           pop DE
0054: C1           pop BC
0055: F1           pop AF
0056: 22 00 00     db $22, lo(out), hi(out)
0059: C9           ret
; func main end

; symbols:
; label main = $0000
; var idx = $1000
; var arr = $1001
; var out = $1011
; label getb = $1234
; label getw = $1240
; label ping = $1250
