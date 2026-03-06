; ZAX lowered .asm trace
; range: $0000..$10C9 (end exclusive)

; func main begin
main:
push IX                        ; 0000: DD E5
ld IX, $0000                   ; 0002: DD 21 00 00
add IX, SP                     ; 0006: DD 39
push AF                        ; 0008: F5
push BC                        ; 0009: C5
push DE                        ; 000A: D5
push HL                        ; 000B: E5
ld A, (idx)                    ; 000C: 3A 00 00
ld H, $0000                    ; 000F: 26 00
ld L, A                        ; 0011: 6F
push HL                        ; 0012: E5
pop HL                         ; 0013: E1
push HL                        ; 0014: E5
ld HL, arr                     ; 0015: 21 00 00
pop DE                         ; 0018: D1
add HL, DE                     ; 0019: 19
push HL                        ; 001A: E5
pop HL                         ; 001B: E1
ld A, (hl)                     ; 001C: 7E
push DE                        ; 001D: D5
push HL                        ; 001E: E5
ld de, arr                     ; 001F: 11 00 00
ld hl, (idxw)                  ; 0022: 2A 00 00
add HL, DE                     ; 0025: 19
ld A, (HL)                     ; 0026: 7E
pop HL                         ; 0027: E1
pop DE                         ; 0028: D1
push DE                        ; 0029: D5
push HL                        ; 002A: E5
ld de, arr                     ; 002B: 11 00 00
add HL, DE                     ; 002E: 19
ld A, (HL)                     ; 002F: 7E
pop HL                         ; 0030: E1
pop DE                         ; 0031: D1
ld a, (hl)                     ; 0032: 7E
ld L, A                        ; 0033: 6F
ld H, $0000                    ; 0034: 26 00
push HL                        ; 0036: E5
ld HL, arr                     ; 0037: 21 00 00
pop DE                         ; 003A: D1
add HL, DE                     ; 003B: 19
push HL                        ; 003C: E5
pop HL                         ; 003D: E1
ld A, (hl)                     ; 003E: 7E
ld A, (idx)                    ; 003F: 3A 00 00
ld H, $0000                    ; 0042: 26 00
ld L, A                        ; 0044: 6F
push HL                        ; 0045: E5
pop HL                         ; 0046: E1
add HL, HL                     ; 0047: 29
add HL, HL                     ; 0048: 29
add HL, HL                     ; 0049: 29
push HL                        ; 004A: E5
ld HL, grid                    ; 004B: 21 00 00
pop DE                         ; 004E: D1
add HL, DE                     ; 004F: 19
push HL                        ; 0050: E5
pop HL                         ; 0051: E1
ld A, (hl)                     ; 0052: 7E
__zax_epilogue_0:
pop HL                         ; 0053: E1
pop DE                         ; 0054: D1
pop BC                         ; 0055: C1
pop AF                         ; 0056: F1
ld SP, IX                      ; 0057: DD F9
pop IX                         ; 0059: DD E1
ret                            ; 005B: C9
; func main end

; symbols:
; label main = $0000
; label __zax_epilogue_0 = $0053
; data idx = $1000
; data idxw = $1001
; data arr = $1003
; data grid = $1013
; label __zax_startup = $1033
