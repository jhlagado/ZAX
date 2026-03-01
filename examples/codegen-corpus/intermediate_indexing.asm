; ZAX lowered .asm trace
; range: $0000..$0065 (end exclusive)

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
ld HL, (idxw)                  ; 001D: 2A 00 00
push HL                        ; 0020: E5
pop HL                         ; 0021: E1
push HL                        ; 0022: E5
ld HL, arr                     ; 0023: 21 00 00
pop DE                         ; 0026: D1
add HL, DE                     ; 0027: 19
push HL                        ; 0028: E5
pop HL                         ; 0029: E1
ld A, (hl)                     ; 002A: 7E
push DE                        ; 002B: D5
push HL                        ; 002C: E5
ld de, arr                     ; 002D: 11 00 00
add HL, DE                     ; 0030: 19
ld A, (HL)                     ; 0031: 7E
pop HL                         ; 0032: E1
pop DE                         ; 0033: D1
ld a, (hl)                     ; 0034: 7E
ld L, A                        ; 0035: 6F
ld H, $0000                    ; 0036: 26 00
push HL                        ; 0038: E5
ld HL, arr                     ; 0039: 21 00 00
pop DE                         ; 003C: D1
add HL, DE                     ; 003D: 19
push HL                        ; 003E: E5
pop HL                         ; 003F: E1
ld A, (hl)                     ; 0040: 7E
ld HL, $0000                   ; 0041: 21 00 00
push HL                        ; 0044: E5
ld A, (idx)                    ; 0045: 3A 00 00
ld H, $0000                    ; 0048: 26 00
ld L, A                        ; 004A: 6F
push HL                        ; 004B: E5
pop HL                         ; 004C: E1
add HL, HL                     ; 004D: 29
add HL, HL                     ; 004E: 29
push HL                        ; 004F: E5
ld HL, grid                    ; 0050: 21 00 00
pop DE                         ; 0053: D1
add HL, DE                     ; 0054: 19
push HL                        ; 0055: E5
pop HL                         ; 0056: E1
pop DE                         ; 0057: D1
add HL, DE                     ; 0058: 19
push HL                        ; 0059: E5
pop HL                         ; 005A: E1
ld A, (hl)                     ; 005B: 7E
__zax_epilogue_0:
pop HL                         ; 005C: E1
pop DE                         ; 005D: D1
pop BC                         ; 005E: C1
pop AF                         ; 005F: F1
ld SP, IX                      ; 0060: DD F9
pop IX                         ; 0062: DD E1
ret                            ; 0064: C9
; func main end

; symbols:
; label main = $0000
; label __zax_epilogue_0 = $005C
; var idx = $1000
; var idxw = $1001
; var arr = $1003
; var grid = $1013
