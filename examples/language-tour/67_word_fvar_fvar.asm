; ZAX lowered .asm trace
; range: $0100..$2010 (end exclusive)

; func word_fvar_fvar begin
word_fvar_fvar:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push HL                        ; 010B: E5
ld E, (IX + $0004)             ; 010C: DD 5E 04
ld D, (IX + $0005)             ; 010F: DD 56 05
ex DE, HL                      ; 0112: EB
ld E, (IX + $0006)             ; 0113: DD 5E 06
ld D, (IX + $0007)             ; 0116: DD 56 07
ex DE, HL                      ; 0119: EB
add HL, HL                     ; 011A: 29
add HL, DE                     ; 011B: 19
ld E, (HL)                     ; 011C: 5E
inc HL                         ; 011D: 23
ld D, (HL)                     ; 011E: 56
ld L, E                        ; 011F: 6B
ld H, D                        ; 0120: 62
ex DE, HL                      ; 0121: EB
pop HL                         ; 0122: E1
push HL                        ; 0123: E5
push DE                        ; 0124: D5
ld E, (IX + $0004)             ; 0125: DD 5E 04
ld D, (IX + $0005)             ; 0128: DD 56 05
ex DE, HL                      ; 012B: EB
ld E, (IX + $0006)             ; 012C: DD 5E 06
ld D, (IX + $0007)             ; 012F: DD 56 07
ex DE, HL                      ; 0132: EB
add HL, HL                     ; 0133: 29
add HL, DE                     ; 0134: 19
pop DE                         ; 0135: D1
ld (HL), E                     ; 0136: 73
inc HL                         ; 0137: 23
ld (HL), D                     ; 0138: 72
pop HL                         ; 0139: E1
ex DE, HL                      ; 013A: EB
__zax_epilogue_0:
pop DE                         ; 013B: D1
pop BC                         ; 013C: C1
pop AF                         ; 013D: F1
ld SP, IX                      ; 013E: DD F9
pop IX                         ; 0140: DD E1
ret                            ; 0142: C9
; func main begin
; func word_fvar_fvar end
main:
push IX                        ; 0143: DD E5
ld IX, $0000                   ; 0145: DD 21 00 00
add IX, SP                     ; 0149: DD 39
push AF                        ; 014B: F5
push BC                        ; 014C: C5
push DE                        ; 014D: D5
push HL                        ; 014E: E5
ld HL, $0005                   ; 014F: 21 05 00
push HL                        ; 0152: E5
ld HL, glob_words              ; 0153: 21 00 00
push HL                        ; 0156: E5
call word_fvar_fvar            ; 0157: CD 00 00
inc SP                         ; 015A: 33
inc SP                         ; 015B: 33
inc SP                         ; 015C: 33
inc SP                         ; 015D: 33
__zax_epilogue_1:
pop HL                         ; 015E: E1
pop DE                         ; 015F: D1
pop BC                         ; 0160: C1
pop AF                         ; 0161: F1
ld SP, IX                      ; 0162: DD F9
pop IX                         ; 0164: DD E1
ret                            ; 0166: C9
; func main end

; symbols:
; label word_fvar_fvar = $0100
; label __zax_epilogue_0 = $013B
; label main = $0143
; label __zax_epilogue_1 = $015E
; data glob_words = $2000
