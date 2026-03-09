; ZAX lowered .asm trace
; range: $0100..$2071 (end exclusive)

; func word_fvar_fvar begin
word_fvar_fvar:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ex DE, HL                      ; 010B: EB
ld E, (IX + $0006)             ; 010C: DD 5E 06
ld D, (IX + $0007)             ; 010F: DD 56 07
ex DE, HL                      ; 0112: EB
push HL                        ; 0113: E5
pop HL                         ; 0114: E1
add HL, HL                     ; 0115: 29
push HL                        ; 0116: E5
ld E, (IX + $0004)             ; 0117: DD 5E 04
ld D, (IX + $0005)             ; 011A: DD 56 05
ex DE, HL                      ; 011D: EB
pop DE                         ; 011E: D1
add HL, DE                     ; 011F: 19
push HL                        ; 0120: E5
pop HL                         ; 0121: E1
ld E, (HL)                     ; 0122: 5E
inc HL                         ; 0123: 23
ld D, (HL)                     ; 0124: 56
ld E, E                        ; 0125: 5B
ld D, D                        ; 0126: 52
ex DE, HL                      ; 0127: EB
ld E, (IX + $0006)             ; 0128: DD 5E 06
ld D, (IX + $0007)             ; 012B: DD 56 07
ex DE, HL                      ; 012E: EB
push HL                        ; 012F: E5
pop HL                         ; 0130: E1
add HL, HL                     ; 0131: 29
push HL                        ; 0132: E5
ld E, (IX + $0004)             ; 0133: DD 5E 04
ld D, (IX + $0005)             ; 0136: DD 56 05
ex DE, HL                      ; 0139: EB
pop DE                         ; 013A: D1
add HL, DE                     ; 013B: 19
push HL                        ; 013C: E5
pop HL                         ; 013D: E1
ld (HL), E                     ; 013E: 73
inc HL                         ; 013F: 23
ld (HL), D                     ; 0140: 72
ex DE, HL                      ; 0141: EB
__zax_epilogue_0:
pop DE                         ; 0142: D1
pop BC                         ; 0143: C1
pop AF                         ; 0144: F1
ld SP, IX                      ; 0145: DD F9
pop IX                         ; 0147: DD E1
ret                            ; 0149: C9
; func main begin
; func word_fvar_fvar end
main:
push IX                        ; 014A: DD E5
ld IX, $0000                   ; 014C: DD 21 00 00
add IX, SP                     ; 0150: DD 39
push AF                        ; 0152: F5
push BC                        ; 0153: C5
push DE                        ; 0154: D5
push HL                        ; 0155: E5
ld HL, $0005                   ; 0156: 21 05 00
push HL                        ; 0159: E5
ld HL, glob_words              ; 015A: 21 00 00
push HL                        ; 015D: E5
call word_fvar_fvar            ; 015E: CD 00 00
inc SP                         ; 0161: 33
inc SP                         ; 0162: 33
inc SP                         ; 0163: 33
inc SP                         ; 0164: 33
__zax_epilogue_1:
pop HL                         ; 0165: E1
pop DE                         ; 0166: D1
pop BC                         ; 0167: C1
pop AF                         ; 0168: F1
ld SP, IX                      ; 0169: DD F9
pop IX                         ; 016B: DD E1
ret                            ; 016D: C9
; func main end

; symbols:
; label word_fvar_fvar = $0100
; label __zax_epilogue_0 = $0142
; label main = $014A
; label __zax_epilogue_1 = $0165
; data glob_words = $2000
; label __zax_startup = $2010
