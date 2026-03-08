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
push AF                        ; 000C: F5
push BC                        ; 000D: C5
push DE                        ; 000E: D5
ld A, (idx)                    ; 000F: 3A 00 00
ld H, $0000                    ; 0012: 26 00
ld L, A                        ; 0014: 6F
push HL                        ; 0015: E5
pop HL                         ; 0016: E1
push HL                        ; 0017: E5
ld HL, arr                     ; 0018: 21 00 00
pop DE                         ; 001B: D1
add HL, DE                     ; 001C: 19
push HL                        ; 001D: E5
pop HL                         ; 001E: E1
pop DE                         ; 001F: D1
pop BC                         ; 0020: C1
pop AF                         ; 0021: F1
ld A, (hl)                     ; 0022: 7E
push AF                        ; 0023: F5
push BC                        ; 0024: C5
push DE                        ; 0025: D5
ld hl, (idxw)                  ; 0026: 2A 00 00
push HL                        ; 0029: E5
pop HL                         ; 002A: E1
push HL                        ; 002B: E5
ld HL, arr                     ; 002C: 21 00 00
pop DE                         ; 002F: D1
add HL, DE                     ; 0030: 19
push HL                        ; 0031: E5
pop HL                         ; 0032: E1
pop DE                         ; 0033: D1
pop BC                         ; 0034: C1
pop AF                         ; 0035: F1
ld A, (hl)                     ; 0036: 7E
push AF                        ; 0037: F5
push BC                        ; 0038: C5
push DE                        ; 0039: D5
ld DE, arr                     ; 003A: 11 00 00
add HL, DE                     ; 003D: 19
push HL                        ; 003E: E5
pop HL                         ; 003F: E1
pop DE                         ; 0040: D1
pop BC                         ; 0041: C1
pop AF                         ; 0042: F1
ld A, (hl)                     ; 0043: 7E
push AF                        ; 0044: F5
push BC                        ; 0045: C5
push DE                        ; 0046: D5
ld a, (hl)                     ; 0047: 7E
ld L, A                        ; 0048: 6F
ld H, $0000                    ; 0049: 26 00
push HL                        ; 004B: E5
ld HL, arr                     ; 004C: 21 00 00
pop DE                         ; 004F: D1
add HL, DE                     ; 0050: 19
push HL                        ; 0051: E5
pop HL                         ; 0052: E1
pop DE                         ; 0053: D1
pop BC                         ; 0054: C1
pop AF                         ; 0055: F1
ld A, (hl)                     ; 0056: 7E
push AF                        ; 0057: F5
push BC                        ; 0058: C5
push DE                        ; 0059: D5
ld A, (idx)                    ; 005A: 3A 00 00
ld H, $0000                    ; 005D: 26 00
ld L, A                        ; 005F: 6F
push HL                        ; 0060: E5
pop HL                         ; 0061: E1
add HL, HL                     ; 0062: 29
add HL, HL                     ; 0063: 29
add HL, HL                     ; 0064: 29
push HL                        ; 0065: E5
ld HL, grid                    ; 0066: 21 00 00
pop DE                         ; 0069: D1
add HL, DE                     ; 006A: 19
push HL                        ; 006B: E5
pop HL                         ; 006C: E1
pop DE                         ; 006D: D1
pop BC                         ; 006E: C1
pop AF                         ; 006F: F1
ld A, (hl)                     ; 0070: 7E
__zax_epilogue_0:
pop HL                         ; 0071: E1
pop DE                         ; 0072: D1
pop BC                         ; 0073: C1
pop AF                         ; 0074: F1
ld SP, IX                      ; 0075: DD F9
pop IX                         ; 0077: DD E1
ret                            ; 0079: C9
; func main end

; symbols:
; label main = $0000
; label __zax_epilogue_0 = $0071
; data idx = $1000
; data idxw = $1001
; data arr = $1003
; data grid = $1013
; label __zax_startup = $1033
