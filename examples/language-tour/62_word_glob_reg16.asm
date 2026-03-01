; ZAX lowered .asm trace
; range: $0100..$2010 (end exclusive)

; func word_glob_reg16 begin
word_glob_reg16:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ex DE, HL                      ; 010B: EB
ld E, (IX + $0004)             ; 010C: DD 5E 04
ld D, (IX + $0005)             ; 010F: DD 56 05
ex DE, HL                      ; 0112: EB
push HL                        ; 0113: E5
ld de, glob_words              ; 0114: 11 00 00
add HL, HL                     ; 0117: 29
add HL, DE                     ; 0118: 19
ld E, (HL)                     ; 0119: 5E
inc HL                         ; 011A: 23
ld D, (HL)                     ; 011B: 56
ld L, E                        ; 011C: 6B
ld H, D                        ; 011D: 62
ex DE, HL                      ; 011E: EB
pop HL                         ; 011F: E1
push HL                        ; 0120: E5
push DE                        ; 0121: D5
ld de, glob_words              ; 0122: 11 00 00
add HL, HL                     ; 0125: 29
add HL, DE                     ; 0126: 19
pop DE                         ; 0127: D1
ld E, E                        ; 0128: 5B
ld D, D                        ; 0129: 52
ld (HL), E                     ; 012A: 73
inc HL                         ; 012B: 23
ld (HL), D                     ; 012C: 72
pop HL                         ; 012D: E1
ex DE, HL                      ; 012E: EB
__zax_epilogue_0:
pop DE                         ; 012F: D1
pop BC                         ; 0130: C1
pop AF                         ; 0131: F1
ld SP, IX                      ; 0132: DD F9
pop IX                         ; 0134: DD E1
ret                            ; 0136: C9
; func main begin
; func word_glob_reg16 end
main:
push IX                        ; 0137: DD E5
ld IX, $0000                   ; 0139: DD 21 00 00
add IX, SP                     ; 013D: DD 39
push AF                        ; 013F: F5
push BC                        ; 0140: C5
push DE                        ; 0141: D5
push HL                        ; 0142: E5
ld HL, $0004                   ; 0143: 21 04 00
push HL                        ; 0146: E5
call word_glob_reg16           ; 0147: CD 00 00
inc SP                         ; 014A: 33
inc SP                         ; 014B: 33
__zax_epilogue_1:
pop HL                         ; 014C: E1
pop DE                         ; 014D: D1
pop BC                         ; 014E: C1
pop AF                         ; 014F: F1
ld SP, IX                      ; 0150: DD F9
pop IX                         ; 0152: DD E1
ret                            ; 0154: C9
; func main end

; symbols:
; label word_glob_reg16 = $0100
; label __zax_epilogue_0 = $012F
; label main = $0137
; label __zax_epilogue_1 = $014C
; data glob_words = $2000
