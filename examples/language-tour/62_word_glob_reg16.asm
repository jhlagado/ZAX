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
ld (HL), E                     ; 0128: 73
inc HL                         ; 0129: 23
ld (HL), D                     ; 012A: 72
pop HL                         ; 012B: E1
ex DE, HL                      ; 012C: EB
__zax_epilogue_0:
pop DE                         ; 012D: D1
pop BC                         ; 012E: C1
pop AF                         ; 012F: F1
ld SP, IX                      ; 0130: DD F9
pop IX                         ; 0132: DD E1
ret                            ; 0134: C9
; func main begin
; func word_glob_reg16 end
main:
push IX                        ; 0135: DD E5
ld IX, $0000                   ; 0137: DD 21 00 00
add IX, SP                     ; 013B: DD 39
push AF                        ; 013D: F5
push BC                        ; 013E: C5
push DE                        ; 013F: D5
push HL                        ; 0140: E5
ld HL, $0004                   ; 0141: 21 04 00
push HL                        ; 0144: E5
call word_glob_reg16           ; 0145: CD 00 00
inc SP                         ; 0148: 33
inc SP                         ; 0149: 33
__zax_epilogue_1:
pop HL                         ; 014A: E1
pop DE                         ; 014B: D1
pop BC                         ; 014C: C1
pop AF                         ; 014D: F1
ld SP, IX                      ; 014E: DD F9
pop IX                         ; 0150: DD E1
ret                            ; 0152: C9
; func main end

; symbols:
; label word_glob_reg16 = $0100
; label __zax_epilogue_0 = $012D
; label main = $0135
; label __zax_epilogue_1 = $014A
; data glob_words = $2000
