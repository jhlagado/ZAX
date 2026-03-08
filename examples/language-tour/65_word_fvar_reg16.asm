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
push AF                        ; 010B: F5
push BC                        ; 010C: C5
push DE                        ; 010D: D5
push IX                        ; 010E: DD E5
pop HL                         ; 0110: E1
ld DE, $0006                   ; 0111: 11 06 00
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
ex DE, HL                      ; 0125: EB
push DE                        ; 0126: D5
push IX                        ; 0127: DD E5
pop HL                         ; 0129: E1
ld DE, $0004                   ; 012A: 11 04 00
add HL, DE                     ; 012D: 19
pop DE                         ; 012E: D1
add HL, DE                     ; 012F: 19
push HL                        ; 0130: E5
pop HL                         ; 0131: E1
pop DE                         ; 0132: D1
pop BC                         ; 0133: C1
pop AF                         ; 0134: F1
push DE                        ; 0135: D5
ld E, (HL)                     ; 0136: 5E
inc HL                         ; 0137: 23
ld D, (HL)                     ; 0138: 56
ld C, E                        ; 0139: 4B
ld B, D                        ; 013A: 42
pop DE                         ; 013B: D1
push AF                        ; 013C: F5
push BC                        ; 013D: C5
push DE                        ; 013E: D5
add HL, HL                     ; 013F: 29
ex DE, HL                      ; 0140: EB
push DE                        ; 0141: D5
push IX                        ; 0142: DD E5
pop HL                         ; 0144: E1
ld DE, $0004                   ; 0145: 11 04 00
add HL, DE                     ; 0148: 19
pop DE                         ; 0149: D1
add HL, DE                     ; 014A: 19
push HL                        ; 014B: E5
pop HL                         ; 014C: E1
pop DE                         ; 014D: D1
pop BC                         ; 014E: C1
pop AF                         ; 014F: F1
ld E, C                        ; 0150: 59
ld D, B                        ; 0151: 50
ld (HL), E                     ; 0152: 73
inc HL                         ; 0153: 23
ld (HL), D                     ; 0154: 72
ld H, B                        ; 0155: 60
ld L, C                        ; 0156: 69
__zax_epilogue_0:
pop DE                         ; 0157: D1
pop BC                         ; 0158: C1
pop AF                         ; 0159: F1
ld SP, IX                      ; 015A: DD F9
pop IX                         ; 015C: DD E1
ret                            ; 015E: C9
; func main begin
; func word_fvar_reg16 end
main:
push IX                        ; 015F: DD E5
ld IX, $0000                   ; 0161: DD 21 00 00
add IX, SP                     ; 0165: DD 39
push AF                        ; 0167: F5
push BC                        ; 0168: C5
push DE                        ; 0169: D5
push HL                        ; 016A: E5
ld HL, $0006                   ; 016B: 21 06 00
push HL                        ; 016E: E5
ld HL, glob_words              ; 016F: 21 00 00
push HL                        ; 0172: E5
call word_fvar_reg16           ; 0173: CD 00 00
inc SP                         ; 0176: 33
inc SP                         ; 0177: 33
inc SP                         ; 0178: 33
inc SP                         ; 0179: 33
__zax_epilogue_1:
pop HL                         ; 017A: E1
pop DE                         ; 017B: D1
pop BC                         ; 017C: C1
pop AF                         ; 017D: F1
ld SP, IX                      ; 017E: DD F9
pop IX                         ; 0180: DD E1
ret                            ; 0182: C9
; func main end

; symbols:
; label word_fvar_reg16 = $0100
; label __zax_epilogue_0 = $0157
; label main = $015F
; label __zax_epilogue_1 = $017A
; data glob_words = $2000
; label __zax_startup = $2010
