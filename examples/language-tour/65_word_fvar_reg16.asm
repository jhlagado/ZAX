; ZAX lowered .asm trace
; range: $0100..$2071 (end exclusive)

; func word_fvar_reg16 begin
word_fvar_reg16:
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
push AF                        ; 0113: F5
push BC                        ; 0114: C5
push DE                        ; 0115: D5
add HL, HL                     ; 0116: 29
ex DE, HL                      ; 0117: EB
push DE                        ; 0118: D5
push IX                        ; 0119: DD E5
pop HL                         ; 011B: E1
ld DE, $0004                   ; 011C: 11 04 00
add HL, DE                     ; 011F: 19
pop DE                         ; 0120: D1
add HL, DE                     ; 0121: 19
push HL                        ; 0122: E5
pop HL                         ; 0123: E1
pop DE                         ; 0124: D1
pop BC                         ; 0125: C1
pop AF                         ; 0126: F1
push DE                        ; 0127: D5
ld E, (HL)                     ; 0128: 5E
inc HL                         ; 0129: 23
ld D, (HL)                     ; 012A: 56
ld C, E                        ; 012B: 4B
ld B, D                        ; 012C: 42
pop DE                         ; 012D: D1
push AF                        ; 012E: F5
push BC                        ; 012F: C5
push DE                        ; 0130: D5
add HL, HL                     ; 0131: 29
ex DE, HL                      ; 0132: EB
push DE                        ; 0133: D5
push IX                        ; 0134: DD E5
pop HL                         ; 0136: E1
ld DE, $0004                   ; 0137: 11 04 00
add HL, DE                     ; 013A: 19
pop DE                         ; 013B: D1
add HL, DE                     ; 013C: 19
push HL                        ; 013D: E5
pop HL                         ; 013E: E1
pop DE                         ; 013F: D1
pop BC                         ; 0140: C1
pop AF                         ; 0141: F1
ld E, C                        ; 0142: 59
ld D, B                        ; 0143: 50
ld (HL), E                     ; 0144: 73
inc HL                         ; 0145: 23
ld (HL), D                     ; 0146: 72
ld H, B                        ; 0147: 60
ld L, C                        ; 0148: 69
__zax_epilogue_0:
pop DE                         ; 0149: D1
pop BC                         ; 014A: C1
pop AF                         ; 014B: F1
ld SP, IX                      ; 014C: DD F9
pop IX                         ; 014E: DD E1
ret                            ; 0150: C9
; func main begin
; func word_fvar_reg16 end
main:
push IX                        ; 0151: DD E5
ld IX, $0000                   ; 0153: DD 21 00 00
add IX, SP                     ; 0157: DD 39
push AF                        ; 0159: F5
push BC                        ; 015A: C5
push DE                        ; 015B: D5
push HL                        ; 015C: E5
ld HL, $0006                   ; 015D: 21 06 00
push HL                        ; 0160: E5
ld HL, glob_words              ; 0161: 21 00 00
push HL                        ; 0164: E5
call word_fvar_reg16           ; 0165: CD 00 00
inc SP                         ; 0168: 33
inc SP                         ; 0169: 33
inc SP                         ; 016A: 33
inc SP                         ; 016B: 33
__zax_epilogue_1:
pop HL                         ; 016C: E1
pop DE                         ; 016D: D1
pop BC                         ; 016E: C1
pop AF                         ; 016F: F1
ld SP, IX                      ; 0170: DD F9
pop IX                         ; 0172: DD E1
ret                            ; 0174: C9
; func main end

; symbols:
; label word_fvar_reg16 = $0100
; label __zax_epilogue_0 = $0149
; label main = $0151
; label __zax_epilogue_1 = $016C
; data glob_words = $2000
; label __zax_startup = $2010
