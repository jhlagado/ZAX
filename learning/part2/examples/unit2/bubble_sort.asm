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
; func bubble_pass begin
; func swap_values end
bubble_pass:
push IX                        ; 016F: DD E5
ld IX, $0000                   ; 0171: DD 21 00 00
add IX, SP                     ; 0175: DD 39
push HL                        ; 0177: E5
ld HL, $0000                   ; 0178: 21 00 00
ex (SP), HL                    ; 017B: E3
push HL                        ; 017C: E5
ld HL, $0000                   ; 017D: 21 00 00
ex (SP), HL                    ; 0180: E3
push HL                        ; 0181: E5
ld HL, $0000                   ; 0182: 21 00 00
ex (SP), HL                    ; 0185: E3
push HL                        ; 0186: E5
ld HL, $0000                   ; 0187: 21 00 00
ex (SP), HL                    ; 018A: E3
push AF                        ; 018B: F5
push BC                        ; 018C: C5
push DE                        ; 018D: D5
push HL                        ; 018E: E5
ld A, $0001                    ; 018F: 3E 01
or A                           ; 0191: B7
__zax_while_cond_2:
jp z, __zax_while_end_3        ; 0192: CA 00 00
ld A, (ix-$02)                 ; 0195: DD 7E FE
ld B, (ix+$04)                 ; 0198: DD 46 04
cp B                           ; 019B: B8
jp c, __zax_if_else_4          ; 019C: DA 00 00
jp __zax_epilogue_1            ; 019F: C3 00 00
__zax_if_else_4:
ex DE, HL                      ; 01A2: EB
ld E, (IX - $0002)             ; 01A3: DD 5E FE
ex DE, HL                      ; 01A6: EB
push DE                        ; 01A7: D5
push HL                        ; 01A8: E5
ld de, values                  ; 01A9: 11 00 00
ld H, $0000                    ; 01AC: 26 00
ld L, L                        ; 01AE: 6D
add HL, DE                     ; 01AF: 19
ld A, (HL)                     ; 01B0: 7E
pop HL                         ; 01B1: E1
pop DE                         ; 01B2: D1
ld (ix-$06), A                 ; 01B3: DD 77 FA
push AF                        ; 01B6: F5
ld A, (ix-$02)                 ; 01B7: DD 7E FE
ld (ix-$04), A                 ; 01BA: DD 77 FC
pop AF                         ; 01BD: F1
push DE                        ; 01BE: D5
ld E, (IX - $0004)             ; 01BF: DD 5E FC
inc E                          ; 01C2: 1C
ld (IX - $0004), E             ; 01C3: DD 73 FC
pop DE                         ; 01C6: D1
ex DE, HL                      ; 01C7: EB
ld E, (IX - $0004)             ; 01C8: DD 5E FC
ex DE, HL                      ; 01CB: EB
push DE                        ; 01CC: D5
push HL                        ; 01CD: E5
ld de, values                  ; 01CE: 11 00 00
ld H, $0000                    ; 01D1: 26 00
ld L, L                        ; 01D3: 6D
add HL, DE                     ; 01D4: 19
ld A, (HL)                     ; 01D5: 7E
pop HL                         ; 01D6: E1
pop DE                         ; 01D7: D1
ld (ix-$08), A                 ; 01D8: DD 77 F8
ld A, (ix-$06)                 ; 01DB: DD 7E FA
ld B, (ix-$08)                 ; 01DE: DD 46 F8
cp B                           ; 01E1: B8
jp c, __zax_if_else_6          ; 01E2: DA 00 00
jp z, __zax_if_else_8          ; 01E5: CA 00 00
ld e, (ix-$04)                 ; 01E8: DD 5E FC
ld H, $0000                    ; 01EB: 26 00
ld L, E                        ; 01ED: 6B
push HL                        ; 01EE: E5
ld e, (ix-$02)                 ; 01EF: DD 5E FE
ld H, $0000                    ; 01F2: 26 00
ld L, E                        ; 01F4: 6B
push HL                        ; 01F5: E5
call swap_values               ; 01F6: CD 00 00
inc SP                         ; 01F9: 33
inc SP                         ; 01FA: 33
inc SP                         ; 01FB: 33
inc SP                         ; 01FC: 33
__zax_if_else_6:
__zax_if_else_8:
push DE                        ; 01FD: D5
ld E, (IX - $0002)             ; 01FE: DD 5E FE
inc E                          ; 0201: 1C
ld (IX - $0002), E             ; 0202: DD 73 FE
pop DE                         ; 0205: D1
ld A, $0001                    ; 0206: 3E 01
or A                           ; 0208: B7
jp __zax_while_cond_2          ; 0209: C3 00 00
__zax_epilogue_1:
__zax_while_end_3:
pop HL                         ; 020C: E1
pop DE                         ; 020D: D1
pop BC                         ; 020E: C1
pop AF                         ; 020F: F1
ld SP, IX                      ; 0210: DD F9
pop IX                         ; 0212: DD E1
ret                            ; 0214: C9
; func bubble_pass end
; func bubble_sort begin
bubble_sort:
push IX                        ; 0215: DD E5
ld IX, $0000                   ; 0217: DD 21 00 00
add IX, SP                     ; 021B: DD 39
push HL                        ; 021D: E5
ld HL, $0000                   ; 021E: 21 00 00
ex (SP), HL                    ; 0221: E3
push AF                        ; 0222: F5
push BC                        ; 0223: C5
push DE                        ; 0224: D5
push HL                        ; 0225: E5
ld A, LastIndex                ; 0226: 3E 07
ld (ix-$02), A                 ; 0228: DD 77 FE
ld A, $0001                    ; 022B: 3E 01
or A                           ; 022D: B7
__zax_while_cond_11:
jp z, __zax_while_end_12       ; 022E: CA 00 00
ld A, (ix-$02)                 ; 0231: DD 7E FE
or A                           ; 0234: B7
jp nz, __zax_if_else_13        ; 0235: C2 00 00
jp __zax_epilogue_10           ; 0238: C3 00 00
__zax_if_else_13:
ld e, (ix-$02)                 ; 023B: DD 5E FE
ld H, $0000                    ; 023E: 26 00
ld L, E                        ; 0240: 6B
push HL                        ; 0241: E5
call bubble_pass               ; 0242: CD 00 00
inc SP                         ; 0245: 33
inc SP                         ; 0246: 33
push DE                        ; 0247: D5
ld E, (IX - $0002)             ; 0248: DD 5E FE
dec E                          ; 024B: 1D
ld (IX - $0002), E             ; 024C: DD 73 FE
pop DE                         ; 024F: D1
ld A, $0001                    ; 0250: 3E 01
or A                           ; 0252: B7
jp __zax_while_cond_11         ; 0253: C3 00 00
__zax_epilogue_10:
__zax_while_end_12:
pop HL                         ; 0256: E1
pop DE                         ; 0257: D1
pop BC                         ; 0258: C1
pop AF                         ; 0259: F1
ld SP, IX                      ; 025A: DD F9
pop IX                         ; 025C: DD E1
ret                            ; 025E: C9
; func bubble_sort end
; func main begin
main:
push IX                        ; 025F: DD E5
ld IX, $0000                   ; 0261: DD 21 00 00
add IX, SP                     ; 0265: DD 39
push AF                        ; 0267: F5
push BC                        ; 0268: C5
push DE                        ; 0269: D5
push HL                        ; 026A: E5
call bubble_sort               ; 026B: CD 00 00
__zax_epilogue_15:
pop HL                         ; 026E: E1
pop DE                         ; 026F: D1
pop BC                         ; 0270: C1
pop AF                         ; 0271: F1
ld SP, IX                      ; 0272: DD F9
pop IX                         ; 0274: DD E1
ret                            ; 0276: C9
; func main end

; symbols:
; label swap_values = $0100
; label __zax_epilogue_0 = $0166
; label bubble_pass = $016F
; label __zax_while_cond_2 = $0192
; label __zax_if_else_4 = $01A2
; label __zax_if_else_6 = $01FD
; label __zax_if_else_8 = $01FD
; label __zax_epilogue_1 = $020C
; label __zax_while_end_3 = $020C
; label bubble_sort = $0215
; label __zax_while_cond_11 = $022E
; label __zax_if_else_13 = $023B
; label __zax_epilogue_10 = $0256
; label __zax_while_end_12 = $0256
; label main = $025F
; label __zax_epilogue_15 = $026E
; data values = $8000
; label __zax_startup = $8008
; constant ItemCount = $0008 (8)
; constant LastIndex = $0007 (7)
