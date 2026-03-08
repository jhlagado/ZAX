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
push AF                        ; 010B: F5
push BC                        ; 010C: C5
push DE                        ; 010D: D5
ex DE, HL                      ; 010E: EB
ld E, (IX + $0006)             ; 010F: DD 5E 06
ld D, (IX + $0007)             ; 0112: DD 56 07
ex DE, HL                      ; 0115: EB
push HL                        ; 0116: E5
pop HL                         ; 0117: E1
add HL, HL                     ; 0118: 29
push HL                        ; 0119: E5
ld E, (IX + $0004)             ; 011A: DD 5E 04
ld D, (IX + $0005)             ; 011D: DD 56 05
ex DE, HL                      ; 0120: EB
pop DE                         ; 0121: D1
add HL, DE                     ; 0122: 19
push HL                        ; 0123: E5
pop HL                         ; 0124: E1
pop DE                         ; 0125: D1
pop BC                         ; 0126: C1
pop AF                         ; 0127: F1
ld E, (HL)                     ; 0128: 5E
inc HL                         ; 0129: 23
ld D, (HL)                     ; 012A: 56
ld E, E                        ; 012B: 5B
ld D, D                        ; 012C: 52
push AF                        ; 012D: F5
push BC                        ; 012E: C5
push DE                        ; 012F: D5
ex DE, HL                      ; 0130: EB
ld E, (IX + $0006)             ; 0131: DD 5E 06
ld D, (IX + $0007)             ; 0134: DD 56 07
ex DE, HL                      ; 0137: EB
push HL                        ; 0138: E5
pop HL                         ; 0139: E1
add HL, HL                     ; 013A: 29
push HL                        ; 013B: E5
ld E, (IX + $0004)             ; 013C: DD 5E 04
ld D, (IX + $0005)             ; 013F: DD 56 05
ex DE, HL                      ; 0142: EB
pop DE                         ; 0143: D1
add HL, DE                     ; 0144: 19
push HL                        ; 0145: E5
pop HL                         ; 0146: E1
pop DE                         ; 0147: D1
pop BC                         ; 0148: C1
pop AF                         ; 0149: F1
ld (HL), E                     ; 014A: 73
inc HL                         ; 014B: 23
ld (HL), D                     ; 014C: 72
ex DE, HL                      ; 014D: EB
__zax_epilogue_0:
pop DE                         ; 014E: D1
pop BC                         ; 014F: C1
pop AF                         ; 0150: F1
ld SP, IX                      ; 0151: DD F9
pop IX                         ; 0153: DD E1
ret                            ; 0155: C9
; func main begin
; func word_fvar_fvar end
main:
push IX                        ; 0156: DD E5
ld IX, $0000                   ; 0158: DD 21 00 00
add IX, SP                     ; 015C: DD 39
push AF                        ; 015E: F5
push BC                        ; 015F: C5
push DE                        ; 0160: D5
push HL                        ; 0161: E5
ld HL, $0005                   ; 0162: 21 05 00
push HL                        ; 0165: E5
ld HL, glob_words              ; 0166: 21 00 00
push HL                        ; 0169: E5
call word_fvar_fvar            ; 016A: CD 00 00
inc SP                         ; 016D: 33
inc SP                         ; 016E: 33
inc SP                         ; 016F: 33
inc SP                         ; 0170: 33
__zax_epilogue_1:
pop HL                         ; 0171: E1
pop DE                         ; 0172: D1
pop BC                         ; 0173: C1
pop AF                         ; 0174: F1
ld SP, IX                      ; 0175: DD F9
pop IX                         ; 0177: DD E1
ret                            ; 0179: C9
; func main end

; symbols:
; label word_fvar_fvar = $0100
; label __zax_epilogue_0 = $014E
; label main = $0156
; label __zax_epilogue_1 = $0171
; data glob_words = $2000
; label __zax_startup = $2010
