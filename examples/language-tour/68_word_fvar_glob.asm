; ZAX lowered .asm trace
; range: $0100..$207B (end exclusive)

; func word_fvar_glob begin
word_fvar_glob:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push AF                        ; 010B: F5
push BC                        ; 010C: C5
push DE                        ; 010D: D5
ld hl, (glob_idx_word)         ; 010E: 2A 00 00
push HL                        ; 0111: E5
pop HL                         ; 0112: E1
add HL, HL                     ; 0113: 29
push HL                        ; 0114: E5
ld E, (IX + $0004)             ; 0115: DD 5E 04
ld D, (IX + $0005)             ; 0118: DD 56 05
ex DE, HL                      ; 011B: EB
pop DE                         ; 011C: D1
add HL, DE                     ; 011D: 19
push HL                        ; 011E: E5
pop HL                         ; 011F: E1
pop DE                         ; 0120: D1
pop BC                         ; 0121: C1
pop AF                         ; 0122: F1
push DE                        ; 0123: D5
ld E, (HL)                     ; 0124: 5E
inc HL                         ; 0125: 23
ld D, (HL)                     ; 0126: 56
ld L, E                        ; 0127: 6B
ld H, D                        ; 0128: 62
pop DE                         ; 0129: D1
push DE                        ; 012A: D5
ex DE, HL                      ; 012B: EB
push AF                        ; 012C: F5
push BC                        ; 012D: C5
push DE                        ; 012E: D5
ld hl, (glob_idx_word)         ; 012F: 2A 00 00
push HL                        ; 0132: E5
pop HL                         ; 0133: E1
add HL, HL                     ; 0134: 29
push HL                        ; 0135: E5
ld E, (IX + $0004)             ; 0136: DD 5E 04
ld D, (IX + $0005)             ; 0139: DD 56 05
ex DE, HL                      ; 013C: EB
pop DE                         ; 013D: D1
add HL, DE                     ; 013E: 19
push HL                        ; 013F: E5
pop HL                         ; 0140: E1
pop DE                         ; 0141: D1
pop BC                         ; 0142: C1
pop AF                         ; 0143: F1
ld (HL), E                     ; 0144: 73
inc HL                         ; 0145: 23
ld (HL), D                     ; 0146: 72
ex DE, HL                      ; 0147: EB
pop DE                         ; 0148: D1
__zax_epilogue_0:
pop DE                         ; 0149: D1
pop BC                         ; 014A: C1
pop AF                         ; 014B: F1
ld SP, IX                      ; 014C: DD F9
pop IX                         ; 014E: DD E1
ret                            ; 0150: C9
; func main begin
; func word_fvar_glob end
main:
push IX                        ; 0151: DD E5
ld IX, $0000                   ; 0153: DD 21 00 00
add IX, SP                     ; 0157: DD 39
push AF                        ; 0159: F5
push BC                        ; 015A: C5
push DE                        ; 015B: D5
push HL                        ; 015C: E5
ld HL, glob_words              ; 015D: 21 00 00
push HL                        ; 0160: E5
call word_fvar_glob            ; 0161: CD 00 00
inc SP                         ; 0164: 33
inc SP                         ; 0165: 33
__zax_epilogue_1:
pop HL                         ; 0166: E1
pop DE                         ; 0167: D1
pop BC                         ; 0168: C1
pop AF                         ; 0169: F1
ld SP, IX                      ; 016A: DD F9
pop IX                         ; 016C: DD E1
ret                            ; 016E: C9
; func main end

; symbols:
; label word_fvar_glob = $0100
; label __zax_epilogue_0 = $0149
; label main = $0151
; label __zax_epilogue_1 = $0166
; data glob_words = $2000
; data glob_idx_word = $2010
; label __zax_startup = $2012
