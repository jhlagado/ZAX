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
ld e, (ix+$06)                 ; 010B: DD 5E 06
ld d, (ix+$07)                 ; 010E: DD 56 07
ex de, hl                      ; 0111: EB
push HL                        ; 0112: E5
pop HL                         ; 0113: E1
add HL, HL                     ; 0114: 29
push HL                        ; 0115: E5
push DE                        ; 0116: D5
push IX                        ; 0117: DD E5
pop HL                         ; 0119: E1
ld DE, $0004                   ; 011A: 11 04 00
add HL, DE                     ; 011D: 19
pop DE                         ; 011E: D1
pop DE                         ; 011F: D1
add HL, DE                     ; 0120: 19
push HL                        ; 0121: E5
pop HL                         ; 0122: E1
ld a, (hl) ; inc hl ; ld d, (hl) ; ld e, a ; 0123: 7E 23 56 5F
ld e, (ix+$06)                 ; 0127: DD 5E 06
ld d, (ix+$07)                 ; 012A: DD 56 07
ex de, hl                      ; 012D: EB
push HL                        ; 012E: E5
pop HL                         ; 012F: E1
add HL, HL                     ; 0130: 29
push HL                        ; 0131: E5
push DE                        ; 0132: D5
push IX                        ; 0133: DD E5
pop HL                         ; 0135: E1
ld DE, $0004                   ; 0136: 11 04 00
add HL, DE                     ; 0139: 19
pop DE                         ; 013A: D1
pop DE                         ; 013B: D1
add HL, DE                     ; 013C: 19
push HL                        ; 013D: E5
pop HL                         ; 013E: E1
ld (hl), e ; inc hl ; ld (hl), d ; 013F: 73 23 72
ex DE, HL                      ; 0142: EB
__zax_epilogue_0:
pop DE                         ; 0143: D1
pop BC                         ; 0144: C1
pop AF                         ; 0145: F1
ld SP, IX                      ; 0146: DD F9
pop IX                         ; 0148: DD E1
ret                            ; 014A: C9
; func main begin
; func word_fvar_fvar end
main:
push IX                        ; 014B: DD E5
ld IX, $0000                   ; 014D: DD 21 00 00
add IX, SP                     ; 0151: DD 39
push AF                        ; 0153: F5
push BC                        ; 0154: C5
push DE                        ; 0155: D5
push HL                        ; 0156: E5
ld HL, $0005                   ; 0157: 21 05 00
push HL                        ; 015A: E5
ld HL, glob_words              ; 015B: 21 00 00
push HL                        ; 015E: E5
call word_fvar_fvar            ; 015F: CD 00 00
inc SP                         ; 0162: 33
inc SP                         ; 0163: 33
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
; label word_fvar_fvar = $0100
; label __zax_epilogue_0 = $0143
; label main = $014B
; label __zax_epilogue_1 = $0166
; data glob_words = $2000
