; ZAX lowered .asm trace
; range: $0100..$2071 (end exclusive)

; func word_glob_fvar begin
word_glob_fvar:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push AF                        ; 010B: F5
push BC                        ; 010C: C5
push DE                        ; 010D: D5
ex DE, HL                      ; 010E: EB
ld E, (IX + $0004)             ; 010F: DD 5E 04
ld D, (IX + $0005)             ; 0112: DD 56 05
ex DE, HL                      ; 0115: EB
push HL                        ; 0116: E5
pop HL                         ; 0117: E1
add HL, HL                     ; 0118: 29
push HL                        ; 0119: E5
ld HL, glob_words              ; 011A: 21 00 00
pop DE                         ; 011D: D1
add HL, DE                     ; 011E: 19
push HL                        ; 011F: E5
pop HL                         ; 0120: E1
pop DE                         ; 0121: D1
pop BC                         ; 0122: C1
pop AF                         ; 0123: F1
push DE                        ; 0124: D5
ld E, (HL)                     ; 0125: 5E
inc HL                         ; 0126: 23
ld D, (HL)                     ; 0127: 56
ld L, E                        ; 0128: 6B
ld H, D                        ; 0129: 62
pop DE                         ; 012A: D1
push DE                        ; 012B: D5
ex DE, HL                      ; 012C: EB
push AF                        ; 012D: F5
push BC                        ; 012E: C5
push DE                        ; 012F: D5
ex DE, HL                      ; 0130: EB
ld E, (IX + $0004)             ; 0131: DD 5E 04
ld D, (IX + $0005)             ; 0134: DD 56 05
ex DE, HL                      ; 0137: EB
push HL                        ; 0138: E5
pop HL                         ; 0139: E1
add HL, HL                     ; 013A: 29
push HL                        ; 013B: E5
ld HL, glob_words              ; 013C: 21 00 00
pop DE                         ; 013F: D1
add HL, DE                     ; 0140: 19
push HL                        ; 0141: E5
pop HL                         ; 0142: E1
pop DE                         ; 0143: D1
pop BC                         ; 0144: C1
pop AF                         ; 0145: F1
ld (HL), E                     ; 0146: 73
inc HL                         ; 0147: 23
ld (HL), D                     ; 0148: 72
ex DE, HL                      ; 0149: EB
pop DE                         ; 014A: D1
__zax_epilogue_0:
pop DE                         ; 014B: D1
pop BC                         ; 014C: C1
pop AF                         ; 014D: F1
ld SP, IX                      ; 014E: DD F9
pop IX                         ; 0150: DD E1
ret                            ; 0152: C9
; func main begin
; func word_glob_fvar end
main:
push IX                        ; 0153: DD E5
ld IX, $0000                   ; 0155: DD 21 00 00
add IX, SP                     ; 0159: DD 39
push AF                        ; 015B: F5
push BC                        ; 015C: C5
push DE                        ; 015D: D5
push HL                        ; 015E: E5
ld HL, $0002                   ; 015F: 21 02 00
push HL                        ; 0162: E5
call word_glob_fvar            ; 0163: CD 00 00
inc SP                         ; 0166: 33
inc SP                         ; 0167: 33
__zax_epilogue_1:
pop HL                         ; 0168: E1
pop DE                         ; 0169: D1
pop BC                         ; 016A: C1
pop AF                         ; 016B: F1
ld SP, IX                      ; 016C: DD F9
pop IX                         ; 016E: DD E1
ret                            ; 0170: C9
; func main end

; symbols:
; label word_glob_fvar = $0100
; label __zax_epilogue_0 = $014B
; label main = $0153
; label __zax_epilogue_1 = $0168
; data glob_words = $2000
; label __zax_startup = $2010
