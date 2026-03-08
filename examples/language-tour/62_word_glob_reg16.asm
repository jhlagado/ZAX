; ZAX lowered .asm trace
; range: $0100..$2071 (end exclusive)

; func word_glob_reg16 begin
word_glob_reg16:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push AF                        ; 010B: F5
push BC                        ; 010C: C5
push DE                        ; 010D: D5
push IX                        ; 010E: DD E5
pop HL                         ; 0110: E1
ld DE, $0004                   ; 0111: 11 04 00
add HL, DE                     ; 0114: 19
push HL                        ; 0115: E5
pop HL                         ; 0116: E1
pop DE                         ; 0117: D1
pop BC                         ; 0118: C1
pop AF                         ; 0119: F1
push DE                        ; 011A: D5
ld E, (HL)                     ; 011B: 5E
inc HL                         ; 011C: 23
ld D, (HL)                     ; 011D: 56
ld L, E                        ; 011E: 6B
ld H, D                        ; 011F: 62
pop DE                         ; 0120: D1
push AF                        ; 0121: F5
push BC                        ; 0122: C5
push DE                        ; 0123: D5
add HL, HL                     ; 0124: 29
ld DE, glob_words              ; 0125: 11 00 00
add HL, DE                     ; 0128: 19
push HL                        ; 0129: E5
pop HL                         ; 012A: E1
pop DE                         ; 012B: D1
pop BC                         ; 012C: C1
pop AF                         ; 012D: F1
ld E, (HL)                     ; 012E: 5E
inc HL                         ; 012F: 23
ld D, (HL)                     ; 0130: 56
ld E, E                        ; 0131: 5B
ld D, D                        ; 0132: 52
push AF                        ; 0133: F5
push BC                        ; 0134: C5
push DE                        ; 0135: D5
add HL, HL                     ; 0136: 29
ld DE, glob_words              ; 0137: 11 00 00
add HL, DE                     ; 013A: 19
push HL                        ; 013B: E5
pop HL                         ; 013C: E1
pop DE                         ; 013D: D1
pop BC                         ; 013E: C1
pop AF                         ; 013F: F1
ld (HL), E                     ; 0140: 73
inc HL                         ; 0141: 23
ld (HL), D                     ; 0142: 72
ex DE, HL                      ; 0143: EB
__zax_epilogue_0:
pop DE                         ; 0144: D1
pop BC                         ; 0145: C1
pop AF                         ; 0146: F1
ld SP, IX                      ; 0147: DD F9
pop IX                         ; 0149: DD E1
ret                            ; 014B: C9
; func main begin
; func word_glob_reg16 end
main:
push IX                        ; 014C: DD E5
ld IX, $0000                   ; 014E: DD 21 00 00
add IX, SP                     ; 0152: DD 39
push AF                        ; 0154: F5
push BC                        ; 0155: C5
push DE                        ; 0156: D5
push HL                        ; 0157: E5
ld HL, $0004                   ; 0158: 21 04 00
push HL                        ; 015B: E5
call word_glob_reg16           ; 015C: CD 00 00
inc SP                         ; 015F: 33
inc SP                         ; 0160: 33
__zax_epilogue_1:
pop HL                         ; 0161: E1
pop DE                         ; 0162: D1
pop BC                         ; 0163: C1
pop AF                         ; 0164: F1
ld SP, IX                      ; 0165: DD F9
pop IX                         ; 0167: DD E1
ret                            ; 0169: C9
; func main end

; symbols:
; label word_glob_reg16 = $0100
; label __zax_epilogue_0 = $0144
; label main = $014C
; label __zax_epilogue_1 = $0161
; data glob_words = $2000
; label __zax_startup = $2010
