; ZAX lowered .asm trace
; range: $0100..$2071 (end exclusive)

; func word_fvar_const begin
word_fvar_const:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld E, (IX + $0004)             ; 010B: DD 5E 04
ld D, (IX + $0005)             ; 010E: DD 56 05
ex DE, HL                      ; 0111: EB
ld DE, $0004                   ; 0112: 11 04 00
add HL, DE                     ; 0115: 19
push HL                        ; 0116: E5
pop HL                         ; 0117: E1
push DE                        ; 0118: D5
ld E, (HL)                     ; 0119: 5E
inc HL                         ; 011A: 23
ld D, (HL)                     ; 011B: 56
ld L, E                        ; 011C: 6B
ld H, D                        ; 011D: 62
pop DE                         ; 011E: D1
push DE                        ; 011F: D5
push HL                        ; 0120: E5
ld E, (IX + $0004)             ; 0121: DD 5E 04
ld D, (IX + $0005)             ; 0124: DD 56 05
ex DE, HL                      ; 0127: EB
ld DE, $0006                   ; 0128: 11 06 00
add HL, DE                     ; 012B: 19
push HL                        ; 012C: E5
pop HL                         ; 012D: E1
pop DE                         ; 012E: D1
ld (HL), E                     ; 012F: 73
inc HL                         ; 0130: 23
ld (HL), D                     ; 0131: 72
pop DE                         ; 0132: D1
__zax_epilogue_0:
pop DE                         ; 0133: D1
pop BC                         ; 0134: C1
pop AF                         ; 0135: F1
ld SP, IX                      ; 0136: DD F9
pop IX                         ; 0138: DD E1
ret                            ; 013A: C9
; func main begin
; func word_fvar_const end
main:
push IX                        ; 013B: DD E5
ld IX, $0000                   ; 013D: DD 21 00 00
add IX, SP                     ; 0141: DD 39
push AF                        ; 0143: F5
push BC                        ; 0144: C5
push DE                        ; 0145: D5
push HL                        ; 0146: E5
ld HL, glob_words              ; 0147: 21 00 00
push HL                        ; 014A: E5
call word_fvar_const           ; 014B: CD 00 00
inc SP                         ; 014E: 33
inc SP                         ; 014F: 33
__zax_epilogue_1:
pop HL                         ; 0150: E1
pop DE                         ; 0151: D1
pop BC                         ; 0152: C1
pop AF                         ; 0153: F1
ld SP, IX                      ; 0154: DD F9
pop IX                         ; 0156: DD E1
ret                            ; 0158: C9
; func main end

; symbols:
; label word_fvar_const = $0100
; label __zax_epilogue_0 = $0133
; label main = $013B
; label __zax_epilogue_1 = $0150
; data glob_words = $2000
; label __zax_startup = $2010
