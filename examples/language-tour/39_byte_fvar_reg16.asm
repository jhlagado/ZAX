; ZAX lowered .asm trace
; range: $0100..$2061 (end exclusive)

; func byte_fvar_reg16 begin
byte_fvar_reg16:
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
ex DE, HL                      ; 0124: EB
push DE                        ; 0125: D5
push IX                        ; 0126: DD E5
pop HL                         ; 0128: E1
ld DE, $0004                   ; 0129: 11 04 00
add HL, DE                     ; 012C: 19
pop DE                         ; 012D: D1
add HL, DE                     ; 012E: 19
push HL                        ; 012F: E5
pop HL                         ; 0130: E1
pop DE                         ; 0131: D1
pop BC                         ; 0132: C1
pop AF                         ; 0133: F1
ld A, (hl)                     ; 0134: 7E
push AF                        ; 0135: F5
push BC                        ; 0136: C5
push DE                        ; 0137: D5
ex DE, HL                      ; 0138: EB
push DE                        ; 0139: D5
push IX                        ; 013A: DD E5
pop HL                         ; 013C: E1
ld DE, $0004                   ; 013D: 11 04 00
add HL, DE                     ; 0140: 19
pop DE                         ; 0141: D1
add HL, DE                     ; 0142: 19
push HL                        ; 0143: E5
pop HL                         ; 0144: E1
pop DE                         ; 0145: D1
pop BC                         ; 0146: C1
pop AF                         ; 0147: F1
ld (hl), A                     ; 0148: 77
ld H, $0000                    ; 0149: 26 00
ld L, A                        ; 014B: 6F
__zax_epilogue_0:
pop DE                         ; 014C: D1
pop BC                         ; 014D: C1
pop AF                         ; 014E: F1
ld SP, IX                      ; 014F: DD F9
pop IX                         ; 0151: DD E1
ret                            ; 0153: C9
; func byte_fvar_reg16 end
; func main begin
main:
push IX                        ; 0154: DD E5
ld IX, $0000                   ; 0156: DD 21 00 00
add IX, SP                     ; 015A: DD 39
push AF                        ; 015C: F5
push BC                        ; 015D: C5
push DE                        ; 015E: D5
push HL                        ; 015F: E5
ld HL, $0006                   ; 0160: 21 06 00
push HL                        ; 0163: E5
ld HL, glob_bytes              ; 0164: 21 00 00
push HL                        ; 0167: E5
call byte_fvar_reg16           ; 0168: CD 00 00
inc SP                         ; 016B: 33
inc SP                         ; 016C: 33
inc SP                         ; 016D: 33
inc SP                         ; 016E: 33
__zax_epilogue_1:
pop HL                         ; 016F: E1
pop DE                         ; 0170: D1
pop BC                         ; 0171: C1
pop AF                         ; 0172: F1
ld SP, IX                      ; 0173: DD F9
pop IX                         ; 0175: DD E1
ret                            ; 0177: C9
; func main end

; symbols:
; label byte_fvar_reg16 = $0100
; label __zax_epilogue_0 = $014C
; label main = $0154
; label __zax_epilogue_1 = $016F
; data glob_bytes = $2000
; label __zax_startup = $2008
