; ZAX lowered .asm trace
; range: $0100..$026F (end exclusive)

; func fib begin
fib:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
ld HL, $0000                   ; 0108: 21 00 00
push HL                        ; 010B: E5
ld HL, $0001                   ; 010C: 21 01 00
push HL                        ; 010F: E5
ld HL, $0000                   ; 0110: 21 00 00
push HL                        ; 0113: E5
ld HL, $0000                   ; 0114: 21 00 00
push HL                        ; 0117: E5
push AF                        ; 0118: F5
push BC                        ; 0119: C5
push DE                        ; 011A: D5
__zax_while_cond_1:
jp z, __zax_while_end_2        ; 011B: CA 00 00
push AF                        ; 011E: F5
push BC                        ; 011F: C5
push DE                        ; 0120: D5
push IX                        ; 0121: DD E5
pop HL                         ; 0123: E1
ld DE, $FFFA                   ; 0124: 11 FA FF
add HL, DE                     ; 0127: 19
push HL                        ; 0128: E5
pop HL                         ; 0129: E1
pop DE                         ; 012A: D1
pop BC                         ; 012B: C1
pop AF                         ; 012C: F1
push DE                        ; 012D: D5
ld E, (HL)                     ; 012E: 5E
inc HL                         ; 012F: 23
ld D, (HL)                     ; 0130: 56
ld L, E                        ; 0131: 6B
ld H, D                        ; 0132: 62
pop DE                         ; 0133: D1
push AF                        ; 0134: F5
push BC                        ; 0135: C5
push DE                        ; 0136: D5
push IX                        ; 0137: DD E5
pop HL                         ; 0139: E1
ld DE, $0004                   ; 013A: 11 04 00
add HL, DE                     ; 013D: 19
push HL                        ; 013E: E5
pop HL                         ; 013F: E1
pop DE                         ; 0140: D1
pop BC                         ; 0141: C1
pop AF                         ; 0142: F1
ld E, (HL)                     ; 0143: 5E
inc HL                         ; 0144: 23
ld D, (HL)                     ; 0145: 56
ld E, E                        ; 0146: 5B
ld D, D                        ; 0147: 52
xor A                          ; 0148: AF
sbc HL, DE                     ; 0149: ED 52
jp nz, __zax_if_else_3         ; 014B: C2 00 00
push AF                        ; 014E: F5
push BC                        ; 014F: C5
push DE                        ; 0150: D5
push IX                        ; 0151: DD E5
pop HL                         ; 0153: E1
ld DE, $FFFE                   ; 0154: 11 FE FF
add HL, DE                     ; 0157: 19
push HL                        ; 0158: E5
pop HL                         ; 0159: E1
pop DE                         ; 015A: D1
pop BC                         ; 015B: C1
pop AF                         ; 015C: F1
push DE                        ; 015D: D5
ld E, (HL)                     ; 015E: 5E
inc HL                         ; 015F: 23
ld D, (HL)                     ; 0160: 56
ld L, E                        ; 0161: 6B
ld H, D                        ; 0162: 62
pop DE                         ; 0163: D1
jp __zax_epilogue_0            ; 0164: C3 00 00
__zax_if_else_3:
push AF                        ; 0167: F5
push BC                        ; 0168: C5
push DE                        ; 0169: D5
push IX                        ; 016A: DD E5
pop HL                         ; 016C: E1
ld DE, $FFFE                   ; 016D: 11 FE FF
add HL, DE                     ; 0170: 19
push HL                        ; 0171: E5
pop HL                         ; 0172: E1
pop DE                         ; 0173: D1
pop BC                         ; 0174: C1
pop AF                         ; 0175: F1
push DE                        ; 0176: D5
ld E, (HL)                     ; 0177: 5E
inc HL                         ; 0178: 23
ld D, (HL)                     ; 0179: 56
ld L, E                        ; 017A: 6B
ld H, D                        ; 017B: 62
pop DE                         ; 017C: D1
push AF                        ; 017D: F5
push BC                        ; 017E: C5
push DE                        ; 017F: D5
push IX                        ; 0180: DD E5
pop HL                         ; 0182: E1
ld DE, $FFFC                   ; 0183: 11 FC FF
add HL, DE                     ; 0186: 19
push HL                        ; 0187: E5
pop HL                         ; 0188: E1
pop DE                         ; 0189: D1
pop BC                         ; 018A: C1
pop AF                         ; 018B: F1
ld E, (HL)                     ; 018C: 5E
inc HL                         ; 018D: 23
ld D, (HL)                     ; 018E: 56
ld E, E                        ; 018F: 5B
ld D, D                        ; 0190: 52
add HL, DE                     ; 0191: 19
push DE                        ; 0192: D5
ex DE, HL                      ; 0193: EB
push AF                        ; 0194: F5
push BC                        ; 0195: C5
push DE                        ; 0196: D5
push IX                        ; 0197: DD E5
pop HL                         ; 0199: E1
ld DE, $FFF8                   ; 019A: 11 F8 FF
add HL, DE                     ; 019D: 19
push HL                        ; 019E: E5
pop HL                         ; 019F: E1
pop DE                         ; 01A0: D1
pop BC                         ; 01A1: C1
pop AF                         ; 01A2: F1
ld (HL), E                     ; 01A3: 73
inc HL                         ; 01A4: 23
ld (HL), D                     ; 01A5: 72
ex DE, HL                      ; 01A6: EB
pop DE                         ; 01A7: D1
push AF                        ; 01A8: F5
push BC                        ; 01A9: C5
push DE                        ; 01AA: D5
push IX                        ; 01AB: DD E5
pop HL                         ; 01AD: E1
ld DE, $FFFC                   ; 01AE: 11 FC FF
add HL, DE                     ; 01B1: 19
push HL                        ; 01B2: E5
pop HL                         ; 01B3: E1
pop DE                         ; 01B4: D1
pop BC                         ; 01B5: C1
pop AF                         ; 01B6: F1
push DE                        ; 01B7: D5
ld E, (HL)                     ; 01B8: 5E
inc HL                         ; 01B9: 23
ld D, (HL)                     ; 01BA: 56
ld L, E                        ; 01BB: 6B
ld H, D                        ; 01BC: 62
pop DE                         ; 01BD: D1
push DE                        ; 01BE: D5
ex DE, HL                      ; 01BF: EB
push AF                        ; 01C0: F5
push BC                        ; 01C1: C5
push DE                        ; 01C2: D5
push IX                        ; 01C3: DD E5
pop HL                         ; 01C5: E1
ld DE, $FFFE                   ; 01C6: 11 FE FF
add HL, DE                     ; 01C9: 19
push HL                        ; 01CA: E5
pop HL                         ; 01CB: E1
pop DE                         ; 01CC: D1
pop BC                         ; 01CD: C1
pop AF                         ; 01CE: F1
ld (HL), E                     ; 01CF: 73
inc HL                         ; 01D0: 23
ld (HL), D                     ; 01D1: 72
ex DE, HL                      ; 01D2: EB
pop DE                         ; 01D3: D1
push AF                        ; 01D4: F5
push BC                        ; 01D5: C5
push DE                        ; 01D6: D5
push IX                        ; 01D7: DD E5
pop HL                         ; 01D9: E1
ld DE, $FFF8                   ; 01DA: 11 F8 FF
add HL, DE                     ; 01DD: 19
push HL                        ; 01DE: E5
pop HL                         ; 01DF: E1
pop DE                         ; 01E0: D1
pop BC                         ; 01E1: C1
pop AF                         ; 01E2: F1
push DE                        ; 01E3: D5
ld E, (HL)                     ; 01E4: 5E
inc HL                         ; 01E5: 23
ld D, (HL)                     ; 01E6: 56
ld L, E                        ; 01E7: 6B
ld H, D                        ; 01E8: 62
pop DE                         ; 01E9: D1
push DE                        ; 01EA: D5
ex DE, HL                      ; 01EB: EB
push AF                        ; 01EC: F5
push BC                        ; 01ED: C5
push DE                        ; 01EE: D5
push IX                        ; 01EF: DD E5
pop HL                         ; 01F1: E1
ld DE, $FFFC                   ; 01F2: 11 FC FF
add HL, DE                     ; 01F5: 19
push HL                        ; 01F6: E5
pop HL                         ; 01F7: E1
pop DE                         ; 01F8: D1
pop BC                         ; 01F9: C1
pop AF                         ; 01FA: F1
ld (HL), E                     ; 01FB: 73
inc HL                         ; 01FC: 23
ld (HL), D                     ; 01FD: 72
ex DE, HL                      ; 01FE: EB
pop DE                         ; 01FF: D1
push AF                        ; 0200: F5
push BC                        ; 0201: C5
push DE                        ; 0202: D5
push IX                        ; 0203: DD E5
pop HL                         ; 0205: E1
ld DE, $FFFA                   ; 0206: 11 FA FF
add HL, DE                     ; 0209: 19
push HL                        ; 020A: E5
pop HL                         ; 020B: E1
pop DE                         ; 020C: D1
pop BC                         ; 020D: C1
pop AF                         ; 020E: F1
push DE                        ; 020F: D5
ld E, (HL)                     ; 0210: 5E
inc HL                         ; 0211: 23
ld D, (HL)                     ; 0212: 56
ld L, E                        ; 0213: 6B
ld H, D                        ; 0214: 62
pop DE                         ; 0215: D1
inc HL                         ; 0216: 23
push DE                        ; 0217: D5
ex DE, HL                      ; 0218: EB
push AF                        ; 0219: F5
push BC                        ; 021A: C5
push DE                        ; 021B: D5
push IX                        ; 021C: DD E5
pop HL                         ; 021E: E1
ld DE, $FFFA                   ; 021F: 11 FA FF
add HL, DE                     ; 0222: 19
push HL                        ; 0223: E5
pop HL                         ; 0224: E1
pop DE                         ; 0225: D1
pop BC                         ; 0226: C1
pop AF                         ; 0227: F1
ld (HL), E                     ; 0228: 73
inc HL                         ; 0229: 23
ld (HL), D                     ; 022A: 72
ex DE, HL                      ; 022B: EB
pop DE                         ; 022C: D1
ld A, $0001                    ; 022D: 3E 01
or A                           ; 022F: B7
jp __zax_while_cond_1          ; 0230: C3 00 00
__zax_while_end_2:
push AF                        ; 0233: F5
push BC                        ; 0234: C5
push DE                        ; 0235: D5
push IX                        ; 0236: DD E5
pop HL                         ; 0238: E1
ld DE, $FFFE                   ; 0239: 11 FE FF
add HL, DE                     ; 023C: 19
push HL                        ; 023D: E5
pop HL                         ; 023E: E1
pop DE                         ; 023F: D1
pop BC                         ; 0240: C1
pop AF                         ; 0241: F1
push DE                        ; 0242: D5
ld E, (HL)                     ; 0243: 5E
inc HL                         ; 0244: 23
ld D, (HL)                     ; 0245: 56
ld L, E                        ; 0246: 6B
ld H, D                        ; 0247: 62
pop DE                         ; 0248: D1
__zax_epilogue_0:
pop DE                         ; 0249: D1
pop BC                         ; 024A: C1
pop AF                         ; 024B: F1
ld SP, IX                      ; 024C: DD F9
pop IX                         ; 024E: DD E1
ret                            ; 0250: C9
; func fib end
; func main begin
main:
push IX                        ; 0251: DD E5
ld IX, $0000                   ; 0253: DD 21 00 00
add IX, SP                     ; 0257: DD 39
push AF                        ; 0259: F5
push BC                        ; 025A: C5
push DE                        ; 025B: D5
push HL                        ; 025C: E5
ld HL, $000A                   ; 025D: 21 0A 00
push HL                        ; 0260: E5
call fib                       ; 0261: CD 00 00
inc SP                         ; 0264: 33
inc SP                         ; 0265: 33
__zax_epilogue_5:
pop HL                         ; 0266: E1
pop DE                         ; 0267: D1
pop BC                         ; 0268: C1
pop AF                         ; 0269: F1
ld SP, IX                      ; 026A: DD F9
pop IX                         ; 026C: DD E1
ret                            ; 026E: C9
; func main end

; symbols:
; label fib = $0100
; label __zax_while_cond_1 = $011B
; label __zax_if_else_3 = $0167
; label __zax_while_end_2 = $0233
; label __zax_epilogue_0 = $0249
; label main = $0251
; label __zax_epilogue_5 = $0266
