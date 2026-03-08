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
push DE                        ; 0023: D5
push HL                        ; 0024: E5
ld de, arr                     ; 0025: 11 00 00
ld hl, (idxw)                  ; 0028: 2A 00 00
add HL, DE                     ; 002B: 19
ld A, (HL)                     ; 002C: 7E
pop HL                         ; 002D: E1
pop DE                         ; 002E: D1
push DE                        ; 002F: D5
push HL                        ; 0030: E5
ld de, arr                     ; 0031: 11 00 00
add HL, DE                     ; 0034: 19
ld A, (HL)                     ; 0035: 7E
pop HL                         ; 0036: E1
pop DE                         ; 0037: D1
push AF                        ; 0038: F5
push BC                        ; 0039: C5
push DE                        ; 003A: D5
ld a, (hl)                     ; 003B: 7E
ld L, A                        ; 003C: 6F
ld H, $0000                    ; 003D: 26 00
push HL                        ; 003F: E5
ld HL, arr                     ; 0040: 21 00 00
pop DE                         ; 0043: D1
add HL, DE                     ; 0044: 19
push HL                        ; 0045: E5
pop HL                         ; 0046: E1
pop DE                         ; 0047: D1
pop BC                         ; 0048: C1
pop AF                         ; 0049: F1
ld A, (hl)                     ; 004A: 7E
push AF                        ; 004B: F5
push BC                        ; 004C: C5
push DE                        ; 004D: D5
ld A, (idx)                    ; 004E: 3A 00 00
ld H, $0000                    ; 0051: 26 00
ld L, A                        ; 0053: 6F
push HL                        ; 0054: E5
pop HL                         ; 0055: E1
add HL, HL                     ; 0056: 29
add HL, HL                     ; 0057: 29
add HL, HL                     ; 0058: 29
push HL                        ; 0059: E5
ld HL, grid                    ; 005A: 21 00 00
pop DE                         ; 005D: D1
add HL, DE                     ; 005E: 19
push HL                        ; 005F: E5
pop HL                         ; 0060: E1
pop DE                         ; 0061: D1
pop BC                         ; 0062: C1
pop AF                         ; 0063: F1
ld A, (hl)                     ; 0064: 7E
__zax_epilogue_0:
pop HL                         ; 0065: E1
pop DE                         ; 0066: D1
pop BC                         ; 0067: C1
pop AF                         ; 0068: F1
ld SP, IX                      ; 0069: DD F9
pop IX                         ; 006B: DD E1
ret                            ; 006D: C9
; func main end

; symbols:
; label main = $0000
; label __zax_epilogue_0 = $0065
; data idx = $1000
; data idxw = $1001
; data arr = $1003
; data grid = $1013
; label __zax_startup = $1033
