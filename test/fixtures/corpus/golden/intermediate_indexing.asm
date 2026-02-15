; ZAX lowered .asm trace
; range: $0000..$0051 (end exclusive)

; func main begin
main:
0000: 3A 00 00     db $3A, lo(idx), hi(idx)
0003: 26 00        ld H, $0000
0005: 6F           ld L, A
0006: E5           push HL
0007: E1           pop HL
0008: E5           push HL
0009: 21 00 00     db $21, lo(arr), hi(arr)
000C: D1           pop DE
000D: 19           add HL, DE
000E: E5           push HL
000F: E1           pop HL
0010: 7E           ld r, (hl)
0011: 2A 00 00     db $2A, lo(idxw), hi(idxw)
0014: E5           push HL
0015: E1           pop HL
0016: E5           push HL
0017: 21 00 00     db $21, lo(arr), hi(arr)
001A: D1           pop DE
001B: 19           add HL, DE
001C: E5           push HL
001D: E1           pop HL
001E: 7E           ld r, (hl)
001F: E5           push HL
0020: 21 00 00     db $21, lo(arr), hi(arr)
0023: D1           pop DE
0024: 19           add HL, DE
0025: E5           push HL
0026: E1           pop HL
0027: 7E           ld r, (hl)
0028: 7E           ld a, (hl)
0029: 6F           ld L, A
002A: 26 00        ld H, $0000
002C: E5           push HL
002D: 21 00 00     db $21, lo(arr), hi(arr)
0030: D1           pop DE
0031: 19           add HL, DE
0032: E5           push HL
0033: E1           pop HL
0034: 7E           ld r, (hl)
0035: 21 00 00     ld HL, $0000
0038: E5           push HL
0039: 3A 00 00     db $3A, lo(idx), hi(idx)
003C: 26 00        ld H, $0000
003E: 6F           ld L, A
003F: E5           push HL
0040: E1           pop HL
0041: 29           add HL, HL
0042: 29           add HL, HL
0043: E5           push HL
0044: 21 00 00     db $21, lo(grid), hi(grid)
0047: D1           pop DE
0048: 19           add HL, DE
0049: E5           push HL
004A: E1           pop HL
004B: D1           pop DE
004C: 19           add HL, DE
004D: E5           push HL
004E: E1           pop HL
004F: 7E           ld r, (hl)
0050: C9           ret
; func main end

; symbols:
; label main = $0000
; var idx = $1000
; var idxw = $1001
; var arr = $1003
; var grid = $1013
