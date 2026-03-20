; ZAX lowered .asm trace
; range: $0100..$8061 (end exclusive)

; func swap_values begin
swap_values:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push HL                        ; 0108: E5
ld HL, $0000                   ; 0109: 21 00 00
ex (SP), HL                    ; 010C: E3
push HL                        ; 010D: E5
ld HL, $0000                   ; 010E: 21 00 00
ex (SP), HL                    ; 0111: E3
push AF                        ; 0112: F5
push BC                        ; 0113: C5
push DE                        ; 0114: D5
push HL                        ; 0115: E5
ex DE, HL                      ; 0116: EB
ld E, (IX + $0004)             ; 0117: DD 5E 04
ex DE, HL                      ; 011A: EB
push DE                        ; 011B: D5
push HL                        ; 011C: E5
ld de, values                  ; 011D: 11 00 00
ld H, $0000                    ; 0120: 26 00
ld L, L                        ; 0122: 6D
add HL, DE                     ; 0123: 19
ld A, (HL)                     ; 0124: 7E
pop HL                         ; 0125: E1
pop DE                         ; 0126: D1
ld (ix-$02), A                 ; 0127: DD 77 FE
ex DE, HL                      ; 012A: EB
ld E, (IX + $0006)             ; 012B: DD 5E 06
ex DE, HL                      ; 012E: EB
push DE                        ; 012F: D5
push HL                        ; 0130: E5
ld de, values                  ; 0131: 11 00 00
ld H, $0000                    ; 0134: 26 00
ld L, L                        ; 0136: 6D
add HL, DE                     ; 0137: 19
ld A, (HL)                     ; 0138: 7E
pop HL                         ; 0139: E1
pop DE                         ; 013A: D1
ld (ix-$04), A                 ; 013B: DD 77 FC
ex DE, HL                      ; 013E: EB
ld E, (IX + $0004)             ; 013F: DD 5E 04
ex DE, HL                      ; 0142: EB
ld A, (ix-$04)                 ; 0143: DD 7E FC
push DE                        ; 0146: D5
push HL                        ; 0147: E5
ld de, values                  ; 0148: 11 00 00
ld H, $0000                    ; 014B: 26 00
ld L, L                        ; 014D: 6D
add HL, DE                     ; 014E: 19
ld (HL), A                     ; 014F: 77
pop HL                         ; 0150: E1
pop DE                         ; 0151: D1
ex DE, HL                      ; 0152: EB
ld E, (IX + $0006)             ; 0153: DD 5E 06
ex DE, HL                      ; 0156: EB
ld A, (ix-$02)                 ; 0157: DD 7E FE
push DE                        ; 015A: D5
push HL                        ; 015B: E5
ld de, values                  ; 015C: 11 00 00
ld H, $0000                    ; 015F: 26 00
ld L, L                        ; 0161: 6D
add HL, DE                     ; 0162: 19
ld (HL), A                     ; 0163: 77
pop HL                         ; 0164: E1
pop DE                         ; 0165: D1
__zax_epilogue_0:
pop HL                         ; 0166: E1
pop DE                         ; 0167: D1
pop BC                         ; 0168: C1
pop AF                         ; 0169: F1
ld SP, IX                      ; 016A: DD F9
pop IX                         ; 016C: DD E1
ret                            ; 016E: C9
; func find_min_index begin
; func swap_values end
find_min_index:
push IX                        ; 016F: DD E5
ld IX, $0000                   ; 0171: DD 21 00 00
add IX, SP                     ; 0175: DD 39
ld HL, $0000                   ; 0177: 21 00 00
push HL                        ; 017A: E5
ld HL, $0000                   ; 017B: 21 00 00
push HL                        ; 017E: E5
ld HL, $0000                   ; 017F: 21 00 00
push HL                        ; 0182: E5
ld HL, $0000                   ; 0183: 21 00 00
push HL                        ; 0186: E5
push AF                        ; 0187: F5
push BC                        ; 0188: C5
push DE                        ; 0189: D5
ld A, (ix+$04)                 ; 018A: DD 7E 04
ld (ix-$02), A                 ; 018D: DD 77 FE
ld (ix-$04), A                 ; 0190: DD 77 FC
ex DE, HL                      ; 0193: EB
ld E, (IX + $0004)             ; 0194: DD 5E 04
ex DE, HL                      ; 0197: EB
push DE                        ; 0198: D5
push HL                        ; 0199: E5
ld de, values                  ; 019A: 11 00 00
ld H, $0000                    ; 019D: 26 00
ld L, L                        ; 019F: 6D
add HL, DE                     ; 01A0: 19
ld A, (HL)                     ; 01A1: 7E
pop HL                         ; 01A2: E1
pop DE                         ; 01A3: D1
ld (ix-$06), A                 ; 01A4: DD 77 FA
ld A, $0001                    ; 01A7: 3E 01
or A                           ; 01A9: B7
__zax_while_cond_2:
jp z, __zax_while_end_3        ; 01AA: CA 00 00
ld A, (ix-$04)                 ; 01AD: DD 7E FC
ld B, (ix+$06)                 ; 01B0: DD 46 06
cp B                           ; 01B3: B8
jp c, __zax_if_else_4          ; 01B4: DA 00 00
jp z, __zax_if_else_6          ; 01B7: CA 00 00
jp __zax_while_end_3           ; 01BA: C3 00 00
__zax_if_else_4:
__zax_if_else_6:
ex DE, HL                      ; 01BD: EB
ld E, (IX - $0004)             ; 01BE: DD 5E FC
ex DE, HL                      ; 01C1: EB
push DE                        ; 01C2: D5
push HL                        ; 01C3: E5
ld de, values                  ; 01C4: 11 00 00
ld H, $0000                    ; 01C7: 26 00
ld L, L                        ; 01C9: 6D
add HL, DE                     ; 01CA: 19
ld A, (HL)                     ; 01CB: 7E
pop HL                         ; 01CC: E1
pop DE                         ; 01CD: D1
ld (ix-$08), A                 ; 01CE: DD 77 F8
ld A, (ix-$08)                 ; 01D1: DD 7E F8
ld B, (ix-$06)                 ; 01D4: DD 46 FA
cp B                           ; 01D7: B8
jp nc, __zax_if_else_8         ; 01D8: D2 00 00
ld A, (ix-$04)                 ; 01DB: DD 7E FC
ld (ix-$02), A                 ; 01DE: DD 77 FE
ld A, (ix-$08)                 ; 01E1: DD 7E F8
ld (ix-$06), A                 ; 01E4: DD 77 FA
__zax_if_else_8:
push DE                        ; 01E7: D5
ld E, (IX - $0004)             ; 01E8: DD 5E FC
inc E                          ; 01EB: 1C
ld (IX - $0004), E             ; 01EC: DD 73 FC
pop DE                         ; 01EF: D1
ld A, $0001                    ; 01F0: 3E 01
or A                           ; 01F2: B7
jp __zax_while_cond_2          ; 01F3: C3 00 00
__zax_while_end_3:
ld H, $0000                    ; 01F6: 26 00
ld A, (ix-$02)                 ; 01F8: DD 7E FE
ld L, A                        ; 01FB: 6F
__zax_epilogue_1:
pop DE                         ; 01FC: D1
pop BC                         ; 01FD: C1
pop AF                         ; 01FE: F1
ld SP, IX                      ; 01FF: DD F9
pop IX                         ; 0201: DD E1
ret                            ; 0203: C9
; func find_min_index end
; func selection_sort begin
selection_sort:
push IX                        ; 0204: DD E5
ld IX, $0000                   ; 0206: DD 21 00 00
add IX, SP                     ; 020A: DD 39
push HL                        ; 020C: E5
ld HL, $0000                   ; 020D: 21 00 00
ex (SP), HL                    ; 0210: E3
push HL                        ; 0211: E5
ld HL, $0000                   ; 0212: 21 00 00
ex (SP), HL                    ; 0215: E3
push AF                        ; 0216: F5
push BC                        ; 0217: C5
push DE                        ; 0218: D5
push HL                        ; 0219: E5
ld A, $0001                    ; 021A: 3E 01
or A                           ; 021C: B7
__zax_while_cond_11:
jp z, __zax_while_end_12       ; 021D: CA 00 00
ld A, (ix-$02)                 ; 0220: DD 7E FE
cp LastIndex                   ; 0223: FE 07
jp c, __zax_if_else_13         ; 0225: DA 00 00
jp __zax_epilogue_10           ; 0228: C3 00 00
__zax_if_else_13:
ld HL, $0007                   ; 022B: 21 07 00
push HL                        ; 022E: E5
ld e, (ix-$02)                 ; 022F: DD 5E FE
ld H, $0000                    ; 0232: 26 00
ld L, E                        ; 0234: 6B
push HL                        ; 0235: E5
call find_min_index            ; 0236: CD 00 00
inc SP                         ; 0239: 33
inc SP                         ; 023A: 33
inc SP                         ; 023B: 33
inc SP                         ; 023C: 33
ld A, L                        ; 023D: 7D
ld (ix-$04), A                 ; 023E: DD 77 FC
ld A, (ix-$04)                 ; 0241: DD 7E FC
ld B, (ix-$02)                 ; 0244: DD 46 FE
cp B                           ; 0247: B8
jp z, __zax_if_else_15         ; 0248: CA 00 00
ld e, (ix-$04)                 ; 024B: DD 5E FC
ld H, $0000                    ; 024E: 26 00
ld L, E                        ; 0250: 6B
push HL                        ; 0251: E5
ld e, (ix-$02)                 ; 0252: DD 5E FE
ld H, $0000                    ; 0255: 26 00
ld L, E                        ; 0257: 6B
push HL                        ; 0258: E5
call swap_values               ; 0259: CD 00 00
inc SP                         ; 025C: 33
inc SP                         ; 025D: 33
inc SP                         ; 025E: 33
inc SP                         ; 025F: 33
__zax_if_else_15:
push DE                        ; 0260: D5
ld E, (IX - $0002)             ; 0261: DD 5E FE
inc E                          ; 0264: 1C
ld (IX - $0002), E             ; 0265: DD 73 FE
pop DE                         ; 0268: D1
ld A, $0001                    ; 0269: 3E 01
or A                           ; 026B: B7
jp __zax_while_cond_11         ; 026C: C3 00 00
__zax_epilogue_10:
__zax_while_end_12:
pop HL                         ; 026F: E1
pop DE                         ; 0270: D1
pop BC                         ; 0271: C1
pop AF                         ; 0272: F1
ld SP, IX                      ; 0273: DD F9
pop IX                         ; 0275: DD E1
ret                            ; 0277: C9
; func main begin
; func selection_sort end
main:
push IX                        ; 0278: DD E5
ld IX, $0000                   ; 027A: DD 21 00 00
add IX, SP                     ; 027E: DD 39
push AF                        ; 0280: F5
push BC                        ; 0281: C5
push DE                        ; 0282: D5
push HL                        ; 0283: E5
call selection_sort            ; 0284: CD 00 00
__zax_epilogue_17:
pop HL                         ; 0287: E1
pop DE                         ; 0288: D1
pop BC                         ; 0289: C1
pop AF                         ; 028A: F1
ld SP, IX                      ; 028B: DD F9
pop IX                         ; 028D: DD E1
ret                            ; 028F: C9
; func main end

; symbols:
; label swap_values = $0100
; label __zax_epilogue_0 = $0166
; label find_min_index = $016F
; label __zax_while_cond_2 = $01AA
; label __zax_if_else_4 = $01BD
; label __zax_if_else_6 = $01BD
; label __zax_if_else_8 = $01E7
; label __zax_while_end_3 = $01F6
; label __zax_epilogue_1 = $01FC
; label selection_sort = $0204
; label __zax_while_cond_11 = $021D
; label __zax_if_else_13 = $022B
; label __zax_if_else_15 = $0260
; label __zax_epilogue_10 = $026F
; label __zax_while_end_12 = $026F
; label main = $0278
; label __zax_epilogue_17 = $0287
; data values = $8000
; label __zax_startup = $8008
; constant ItemCount = $0008 (8)
; constant LastIndex = $0007 (7)
