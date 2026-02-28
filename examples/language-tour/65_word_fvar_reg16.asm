; ZAX lowered .asm trace
; range: $0100..$2010 (end exclusive)

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
push DE                        ; 0113: D5
push HL                        ; 0114: E5
ld E, (IX + $0004)             ; 0115: DD 5E 04
ld D, (IX + $0005)             ; 0118: DD 56 05
add HL, HL                     ; 011B: 29
add HL, DE                     ; 011C: 19
ld E, (HL)                     ; 011D: 5E
inc HL                         ; 011E: 23
ld D, (HL)                     ; 011F: 56
ld L, E                        ; 0120: 6B
ld H, D                        ; 0121: 62
ld C, L                        ; 0122: 4D
ld B, H                        ; 0123: 44
pop HL                         ; 0124: E1
pop DE                         ; 0125: D1
push DE                        ; 0126: D5
push HL                        ; 0127: E5
ld E, (IX + $0004)             ; 0128: DD 5E 04
ld D, (IX + $0005)             ; 012B: DD 56 05
add HL, HL                     ; 012E: 29
add HL, DE                     ; 012F: 19
pop HL                         ; 0130: E1
pop DE                         ; 0131: D1
ld E, C                        ; 0132: 59
ld D, B                        ; 0133: 50
ld (HL), E                     ; 0134: 73
inc HL                         ; 0135: 23
ld (HL), D                     ; 0136: 72
ld H, B                        ; 0137: 60
ld L, C                        ; 0138: 69
__zax_epilogue_0:
pop DE                         ; 0139: D1
pop BC                         ; 013A: C1
pop AF                         ; 013B: F1
ld SP, IX                      ; 013C: DD F9
pop IX                         ; 013E: DD E1
ret                            ; 0140: C9
; func main begin
; func word_fvar_reg16 end
main:
push IX                        ; 0141: DD E5
ld IX, $0000                   ; 0143: DD 21 00 00
add IX, SP                     ; 0147: DD 39
push AF                        ; 0149: F5
push BC                        ; 014A: C5
push DE                        ; 014B: D5
push HL                        ; 014C: E5
ld HL, $0006                   ; 014D: 21 06 00
push HL                        ; 0150: E5
ld HL, glob_words              ; 0151: 21 00 00
push HL                        ; 0154: E5
call word_fvar_reg16           ; 0155: CD 00 00
inc SP                         ; 0158: 33
inc SP                         ; 0159: 33
inc SP                         ; 015A: 33
inc SP                         ; 015B: 33
__zax_epilogue_1:
pop HL                         ; 015C: E1
pop DE                         ; 015D: D1
pop BC                         ; 015E: C1
pop AF                         ; 015F: F1
ld SP, IX                      ; 0160: DD F9
pop IX                         ; 0162: DD E1
ret                            ; 0164: C9
; func main end

; symbols:
; label word_fvar_reg16 = $0100
; label __zax_epilogue_0 = $0139
; label main = $0141
; label __zax_epilogue_1 = $015C
; data glob_words = $2000
