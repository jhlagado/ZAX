; ZAX lowered .asm trace
; range: $0100..$2061 (end exclusive)

; func byte_fvar_const begin
byte_fvar_const:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push AF                        ; 010B: F5
push BC                        ; 010C: C5
push DE                        ; 010D: D5
ld E, (IX + $0004)             ; 010E: DD 5E 04
ld D, (IX + $0005)             ; 0111: DD 56 05
ex DE, HL                      ; 0114: EB
ld DE, $0002                   ; 0115: 11 02 00
add HL, DE                     ; 0118: 19
push HL                        ; 0119: E5
pop HL                         ; 011A: E1
pop DE                         ; 011B: D1
pop BC                         ; 011C: C1
pop AF                         ; 011D: F1
ld A, (hl)                     ; 011E: 7E
push AF                        ; 011F: F5
push AF                        ; 0120: F5
push BC                        ; 0121: C5
push DE                        ; 0122: D5
ld E, (IX + $0004)             ; 0123: DD 5E 04
ld D, (IX + $0005)             ; 0126: DD 56 05
ex DE, HL                      ; 0129: EB
ld DE, $0003                   ; 012A: 11 03 00
add HL, DE                     ; 012D: 19
push HL                        ; 012E: E5
pop HL                         ; 012F: E1
pop DE                         ; 0130: D1
pop BC                         ; 0131: C1
pop AF                         ; 0132: F1
ld (hl), A                     ; 0133: 77
pop AF                         ; 0134: F1
ld H, $0000                    ; 0135: 26 00
ld L, A                        ; 0137: 6F
__zax_epilogue_0:
pop DE                         ; 0138: D1
pop BC                         ; 0139: C1
pop AF                         ; 013A: F1
ld SP, IX                      ; 013B: DD F9
pop IX                         ; 013D: DD E1
ret                            ; 013F: C9
; func byte_fvar_const end
; func main begin
main:
push IX                        ; 0140: DD E5
ld IX, $0000                   ; 0142: DD 21 00 00
add IX, SP                     ; 0146: DD 39
push AF                        ; 0148: F5
push BC                        ; 0149: C5
push DE                        ; 014A: D5
push HL                        ; 014B: E5
ld HL, glob_bytes              ; 014C: 21 00 00
push HL                        ; 014F: E5
call byte_fvar_const           ; 0150: CD 00 00
inc SP                         ; 0153: 33
inc SP                         ; 0154: 33
__zax_epilogue_1:
pop HL                         ; 0155: E1
pop DE                         ; 0156: D1
pop BC                         ; 0157: C1
pop AF                         ; 0158: F1
ld SP, IX                      ; 0159: DD F9
pop IX                         ; 015B: DD E1
ret                            ; 015D: C9
; func main end

; symbols:
; label byte_fvar_const = $0100
; label __zax_epilogue_0 = $0138
; label main = $0140
; label __zax_epilogue_1 = $0155
; data glob_bytes = $2000
; label __zax_startup = $2008
