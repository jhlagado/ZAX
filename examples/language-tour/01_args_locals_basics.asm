; ZAX lowered .asm trace
; range: $0100..$01DC (end exclusive)

; func add_words begin
add_words:
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
push IX                        ; 0124: DD E5
pop HL                         ; 0126: E1
ld DE, $0006                   ; 0127: 11 06 00
add HL, DE                     ; 012A: 19
push HL                        ; 012B: E5
pop HL                         ; 012C: E1
pop DE                         ; 012D: D1
pop BC                         ; 012E: C1
pop AF                         ; 012F: F1
ld E, (HL)                     ; 0130: 5E
inc HL                         ; 0131: 23
ld D, (HL)                     ; 0132: 56
ld E, E                        ; 0133: 5B
ld D, D                        ; 0134: 52
add HL, DE                     ; 0135: 19
__zax_epilogue_0:
pop DE                         ; 0136: D1
pop BC                         ; 0137: C1
pop AF                         ; 0138: F1
ld SP, IX                      ; 0139: DD F9
pop IX                         ; 013B: DD E1
ret                            ; 013D: C9
; func add_words end
; func bump_byte begin
bump_byte:
push IX                        ; 013E: DD E5
ld IX, $0000                   ; 0140: DD 21 00 00
add IX, SP                     ; 0144: DD 39
ld HL, $0000                   ; 0146: 21 00 00
push HL                        ; 0149: E5
push AF                        ; 014A: F5
push BC                        ; 014B: C5
push DE                        ; 014C: D5
push AF                        ; 014D: F5
push BC                        ; 014E: C5
push DE                        ; 014F: D5
push IX                        ; 0150: DD E5
pop HL                         ; 0152: E1
ld DE, $0004                   ; 0153: 11 04 00
add HL, DE                     ; 0156: 19
push HL                        ; 0157: E5
pop HL                         ; 0158: E1
pop DE                         ; 0159: D1
pop BC                         ; 015A: C1
pop AF                         ; 015B: F1
ld L, (hl)                     ; 015C: 6E
ld H, $0000                    ; 015D: 26 00
inc L                          ; 015F: 2C
push DE                        ; 0160: D5
ex DE, HL                      ; 0161: EB
push AF                        ; 0162: F5
push BC                        ; 0163: C5
push DE                        ; 0164: D5
push IX                        ; 0165: DD E5
pop HL                         ; 0167: E1
ld DE, $FFFE                   ; 0168: 11 FE FF
add HL, DE                     ; 016B: 19
push HL                        ; 016C: E5
pop HL                         ; 016D: E1
pop DE                         ; 016E: D1
pop BC                         ; 016F: C1
pop AF                         ; 0170: F1
ld (HL), E                     ; 0171: 73
inc HL                         ; 0172: 23
ld (HL), D                     ; 0173: 72
ex DE, HL                      ; 0174: EB
pop DE                         ; 0175: D1
push AF                        ; 0176: F5
push BC                        ; 0177: C5
push DE                        ; 0178: D5
push IX                        ; 0179: DD E5
pop HL                         ; 017B: E1
ld DE, $FFFE                   ; 017C: 11 FE FF
add HL, DE                     ; 017F: 19
push HL                        ; 0180: E5
pop HL                         ; 0181: E1
pop DE                         ; 0182: D1
pop BC                         ; 0183: C1
pop AF                         ; 0184: F1
push DE                        ; 0185: D5
ld E, (HL)                     ; 0186: 5E
inc HL                         ; 0187: 23
ld D, (HL)                     ; 0188: 56
ld L, E                        ; 0189: 6B
ld H, D                        ; 018A: 62
pop DE                         ; 018B: D1
__zax_epilogue_1:
pop DE                         ; 018C: D1
pop BC                         ; 018D: C1
pop AF                         ; 018E: F1
ld SP, IX                      ; 018F: DD F9
pop IX                         ; 0191: DD E1
ret                            ; 0193: C9
; func bump_byte end
; func main begin
main:
push IX                        ; 0194: DD E5
ld IX, $0000                   ; 0196: DD 21 00 00
add IX, SP                     ; 019A: DD 39
push HL                        ; 019C: E5
ld HL, $0000                   ; 019D: 21 00 00
ex (SP), HL                    ; 01A0: E3
push AF                        ; 01A1: F5
push BC                        ; 01A2: C5
push DE                        ; 01A3: D5
push HL                        ; 01A4: E5
ld HL, $0014                   ; 01A5: 21 14 00
push HL                        ; 01A8: E5
ld HL, $000A                   ; 01A9: 21 0A 00
push HL                        ; 01AC: E5
call add_words                 ; 01AD: CD 00 00
inc SP                         ; 01B0: 33
inc SP                         ; 01B1: 33
inc SP                         ; 01B2: 33
inc SP                         ; 01B3: 33
push DE                        ; 01B4: D5
ex DE, HL                      ; 01B5: EB
push AF                        ; 01B6: F5
push BC                        ; 01B7: C5
push DE                        ; 01B8: D5
push IX                        ; 01B9: DD E5
pop HL                         ; 01BB: E1
ld DE, $FFFE                   ; 01BC: 11 FE FF
add HL, DE                     ; 01BF: 19
push HL                        ; 01C0: E5
pop HL                         ; 01C1: E1
pop DE                         ; 01C2: D1
pop BC                         ; 01C3: C1
pop AF                         ; 01C4: F1
ld (HL), E                     ; 01C5: 73
inc HL                         ; 01C6: 23
ld (HL), D                     ; 01C7: 72
ex DE, HL                      ; 01C8: EB
pop DE                         ; 01C9: D1
ld HL, $0007                   ; 01CA: 21 07 00
push HL                        ; 01CD: E5
call bump_byte                 ; 01CE: CD 00 00
inc SP                         ; 01D1: 33
inc SP                         ; 01D2: 33
__zax_epilogue_2:
pop HL                         ; 01D3: E1
pop DE                         ; 01D4: D1
pop BC                         ; 01D5: C1
pop AF                         ; 01D6: F1
ld SP, IX                      ; 01D7: DD F9
pop IX                         ; 01D9: DD E1
ret                            ; 01DB: C9
; func main end

; symbols:
; label add_words = $0100
; label __zax_epilogue_0 = $0136
; label bump_byte = $013E
; label __zax_epilogue_1 = $018C
; label main = $0194
; label __zax_epilogue_2 = $01D3
