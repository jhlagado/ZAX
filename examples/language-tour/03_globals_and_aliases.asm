; ZAX lowered .asm trace
; range: $0100..$1055 (end exclusive)

; func read_counter begin
read_counter:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push AF                        ; 010B: F5
push BC                        ; 010C: C5
push DE                        ; 010D: D5
ld HL, counter                 ; 010E: 21 00 00
pop DE                         ; 0111: D1
pop BC                         ; 0112: C1
pop AF                         ; 0113: F1
push DE                        ; 0114: D5
ld E, (HL)                     ; 0115: 5E
inc HL                         ; 0116: 23
ld D, (HL)                     ; 0117: 56
ld L, E                        ; 0118: 6B
ld H, D                        ; 0119: 62
pop DE                         ; 011A: D1
__zax_epilogue_0:
pop DE                         ; 011B: D1
pop BC                         ; 011C: C1
pop AF                         ; 011D: F1
ld SP, IX                      ; 011E: DD F9
pop IX                         ; 0120: DD E1
ret                            ; 0122: C9
; func read_counter end
; func write_counter begin
write_counter:
push IX                        ; 0123: DD E5
ld IX, $0000                   ; 0125: DD 21 00 00
add IX, SP                     ; 0129: DD 39
push AF                        ; 012B: F5
push BC                        ; 012C: C5
push DE                        ; 012D: D5
push HL                        ; 012E: E5
push AF                        ; 012F: F5
push BC                        ; 0130: C5
push DE                        ; 0131: D5
push IX                        ; 0132: DD E5
pop HL                         ; 0134: E1
ld DE, $0004                   ; 0135: 11 04 00
add HL, DE                     ; 0138: 19
push HL                        ; 0139: E5
pop HL                         ; 013A: E1
pop DE                         ; 013B: D1
pop BC                         ; 013C: C1
pop AF                         ; 013D: F1
ld E, (HL)                     ; 013E: 5E
inc HL                         ; 013F: 23
ld D, (HL)                     ; 0140: 56
ld E, E                        ; 0141: 5B
ld D, D                        ; 0142: 52
push DE                        ; 0143: D5
push AF                        ; 0144: F5
push BC                        ; 0145: C5
push DE                        ; 0146: D5
ld HL, counter                 ; 0147: 21 00 00
pop DE                         ; 014A: D1
pop BC                         ; 014B: C1
pop AF                         ; 014C: F1
pop DE                         ; 014D: D1
ld (HL), E                     ; 014E: 73
inc HL                         ; 014F: 23
ld (HL), D                     ; 0150: 72
__zax_epilogue_1:
pop HL                         ; 0151: E1
pop DE                         ; 0152: D1
pop BC                         ; 0153: C1
pop AF                         ; 0154: F1
ld SP, IX                      ; 0155: DD F9
pop IX                         ; 0157: DD E1
ret                            ; 0159: C9
; func main begin
; func write_counter end
main:
push IX                        ; 015A: DD E5
ld IX, $0000                   ; 015C: DD 21 00 00
add IX, SP                     ; 0160: DD 39
push AF                        ; 0162: F5
push BC                        ; 0163: C5
push DE                        ; 0164: D5
push HL                        ; 0165: E5
ld HL, $007B                   ; 0166: 21 7B 00
push HL                        ; 0169: E5
call write_counter             ; 016A: CD 00 00
inc SP                         ; 016D: 33
inc SP                         ; 016E: 33
push AF                        ; 016F: F5
push BC                        ; 0170: C5
push DE                        ; 0171: D5
ld HL, counter                 ; 0172: 21 00 00
pop DE                         ; 0175: D1
pop BC                         ; 0176: C1
pop AF                         ; 0177: F1
push DE                        ; 0178: D5
ld E, (HL)                     ; 0179: 5E
inc HL                         ; 017A: 23
ld D, (HL)                     ; 017B: 56
ld L, E                        ; 017C: 6B
ld H, D                        ; 017D: 62
pop DE                         ; 017E: D1
__zax_epilogue_2:
pop HL                         ; 017F: E1
pop DE                         ; 0180: D1
pop BC                         ; 0181: C1
pop AF                         ; 0182: F1
ld SP, IX                      ; 0183: DD F9
pop IX                         ; 0185: DD E1
ret                            ; 0187: C9
; func main end

; symbols:
; label read_counter = $0100
; label __zax_epilogue_0 = $011B
; label write_counter = $0123
; label __zax_epilogue_1 = $0151
; label main = $015A
; label __zax_epilogue_2 = $017F
; data counter = $1000
; label __zax_startup = $1002
