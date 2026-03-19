; ZAX lowered .asm trace
; range: $0100..$805D (end exclusive)

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
ld de, numbers                 ; 011D: 11 00 00
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
ld de, numbers                 ; 0131: 11 00 00
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
ld de, numbers                 ; 0148: 11 00 00
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
ld de, numbers                 ; 015C: 11 00 00
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
; func reverse_range begin
; func swap_values end
reverse_range:
push IX                        ; 016F: DD E5
ld IX, $0000                   ; 0171: DD 21 00 00
add IX, SP                     ; 0175: DD 39
push HL                        ; 0177: E5
ld HL, $0000                   ; 0178: 21 00 00
ex (SP), HL                    ; 017B: E3
push HL                        ; 017C: E5
ld HL, $0000                   ; 017D: 21 00 00
ex (SP), HL                    ; 0180: E3
push AF                        ; 0181: F5
push BC                        ; 0182: C5
push DE                        ; 0183: D5
push HL                        ; 0184: E5
ld A, (ix+$04)                 ; 0185: DD 7E 04
ld B, (ix+$06)                 ; 0188: DD 46 06
cp B                           ; 018B: B8
jp c, __zax_if_else_2          ; 018C: DA 00 00
jp __zax_epilogue_1            ; 018F: C3 00 00
__zax_if_else_2:
ld e, (ix+$06)                 ; 0192: DD 5E 06
ld H, $0000                    ; 0195: 26 00
ld L, E                        ; 0197: 6B
push HL                        ; 0198: E5
ld e, (ix+$04)                 ; 0199: DD 5E 04
ld H, $0000                    ; 019C: 26 00
ld L, E                        ; 019E: 6B
push HL                        ; 019F: E5
call swap_values               ; 01A0: CD 00 00
inc SP                         ; 01A3: 33
inc SP                         ; 01A4: 33
inc SP                         ; 01A5: 33
inc SP                         ; 01A6: 33
push AF                        ; 01A7: F5
ld A, (ix+$04)                 ; 01A8: DD 7E 04
ld (ix-$02), A                 ; 01AB: DD 77 FE
pop AF                         ; 01AE: F1
push DE                        ; 01AF: D5
ld E, (IX - $0002)             ; 01B0: DD 5E FE
inc E                          ; 01B3: 1C
ld (IX - $0002), E             ; 01B4: DD 73 FE
pop DE                         ; 01B7: D1
push AF                        ; 01B8: F5
ld A, (ix+$06)                 ; 01B9: DD 7E 06
ld (ix-$04), A                 ; 01BC: DD 77 FC
pop AF                         ; 01BF: F1
push DE                        ; 01C0: D5
ld E, (IX - $0004)             ; 01C1: DD 5E FC
dec E                          ; 01C4: 1D
ld (IX - $0004), E             ; 01C5: DD 73 FC
pop DE                         ; 01C8: D1
ld e, (ix-$04)                 ; 01C9: DD 5E FC
ld H, $0000                    ; 01CC: 26 00
ld L, E                        ; 01CE: 6B
push HL                        ; 01CF: E5
ld e, (ix-$02)                 ; 01D0: DD 5E FE
ld H, $0000                    ; 01D3: 26 00
ld L, E                        ; 01D5: 6B
push HL                        ; 01D6: E5
call reverse_range             ; 01D7: CD 00 00
inc SP                         ; 01DA: 33
inc SP                         ; 01DB: 33
inc SP                         ; 01DC: 33
inc SP                         ; 01DD: 33
__zax_epilogue_1:
pop HL                         ; 01DE: E1
pop DE                         ; 01DF: D1
pop BC                         ; 01E0: C1
pop AF                         ; 01E1: F1
ld SP, IX                      ; 01E2: DD F9
pop IX                         ; 01E4: DD E1
ret                            ; 01E6: C9
; func main begin
; func reverse_range end
main:
push IX                        ; 01E7: DD E5
ld IX, $0000                   ; 01E9: DD 21 00 00
add IX, SP                     ; 01ED: DD 39
push AF                        ; 01EF: F5
push BC                        ; 01F0: C5
push DE                        ; 01F1: D5
push HL                        ; 01F2: E5
ld HL, $0005                   ; 01F3: 21 05 00
push HL                        ; 01F6: E5
ld HL, $0000                   ; 01F7: 21 00 00
push HL                        ; 01FA: E5
call reverse_range             ; 01FB: CD 00 00
inc SP                         ; 01FE: 33
inc SP                         ; 01FF: 33
inc SP                         ; 0200: 33
inc SP                         ; 0201: 33
__zax_epilogue_4:
pop HL                         ; 0202: E1
pop DE                         ; 0203: D1
pop BC                         ; 0204: C1
pop AF                         ; 0205: F1
ld SP, IX                      ; 0206: DD F9
pop IX                         ; 0208: DD E1
ret                            ; 020A: C9
; func main end

; symbols:
; label swap_values = $0100
; label __zax_epilogue_0 = $0166
; label reverse_range = $016F
; label __zax_if_else_2 = $0192
; label __zax_epilogue_1 = $01DE
; label main = $01E7
; label __zax_epilogue_4 = $0202
; data numbers = $8000
; label __zax_startup = $8006
; constant ItemCount = $0006 (6)
; constant LastIndex = $0005 (5)
